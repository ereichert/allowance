//! Handlers for chore-related API endpoints.

use super::ApiError;
use allowance_domain::Recurrence;
use allowance_service::chore::{create_chore, NewChore};
use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateChoreRequest {
    pub description: String,
    pub value_cents: Option<i64>,
    pub due_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub assignee_ids: Vec<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct ChoreResponse {
    pub id: Uuid,
    pub description: String,
    pub value_cents: i64,
    pub recurrence_cron: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// `POST /api/v1/chores` — create a single-occurrence chore.
pub async fn post_chore(
    State(pool): State<PgPool>,
    Json(body): Json<CreateChoreRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let new_chore = NewChore::new(body.description, body.value_cents, None);

    let result = create_chore(&pool, new_chore, body.assignee_ids, body.due_at)
        .await
        .map_err(ApiError::from)?;

    let response = ChoreResponse {
        id: result.chore.id.0,
        description: result.chore.description,
        value_cents: result.chore.value_cents,
        recurrence_cron: result.chore.recurrence.as_ref().map(Recurrence::to_cron),
        is_active: result.chore.is_active,
        created_at: result.chore.created_at,
        updated_at: result.chore.updated_at,
    };

    Ok((StatusCode::CREATED, Json(response)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{self, Request},
        routing::post,
        Router,
    };
    use serde_json::{json, Value};
    use sqlx::PgPool;
    use tower::ServiceExt;

    fn app(pool: PgPool) -> Router {
        Router::new()
            .route("/api/v1/chores", post(post_chore))
            .with_state(pool)
    }

    use allowance_test_helpers::seed_person;

    async fn post_json(app: Router, path: &str, body: Value) -> (StatusCode, Value) {
        let response = app
            .oneshot(
                Request::builder()
                    .method(http::Method::POST)
                    .uri(path)
                    .header(http::header::CONTENT_TYPE, "application/json")
                    .body(Body::from(body.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();

        let status = response.status();
        let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let json: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
        (status, json)
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn post_chore_returns_201_with_chore(pool: PgPool) {
        let (status, body) = post_json(
            app(pool),
            "/api/v1/chores",
            json!({ "description": "Take out trash", "value_cents": 100 }),
        )
        .await;

        assert_eq!(status, StatusCode::CREATED);
        assert_eq!(body["description"], "Take out trash");
        assert_eq!(body["value_cents"], 100);
        assert_eq!(body["is_active"], true);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn post_chore_returns_400_for_blank_description(pool: PgPool) {
        let (status, body) =
            post_json(app(pool), "/api/v1/chores", json!({ "description": "  " })).await;

        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert!(body["error"].as_str().unwrap().contains("blank"));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn post_chore_returns_422_for_unknown_assignee(pool: PgPool) {
        let (status, _) = post_json(
            app(pool),
            "/api/v1/chores",
            json!({
                "description": "Sweep",
                "assignee_ids": [Uuid::new_v4().to_string()]
            }),
        )
        .await;

        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn post_chore_with_valid_assignee_returns_201(pool: PgPool) {
        let alice = seed_person(&pool, "Alice").await;

        let (status, body) = post_json(
            app(pool),
            "/api/v1/chores",
            json!({
                "description": "Wash dishes",
                "value_cents": 200,
                "assignee_ids": [alice.to_string()]
            }),
        )
        .await;

        assert_eq!(status, StatusCode::CREATED);
        assert_eq!(body["description"], "Wash dishes");
    }
}
