//! Handler for listing chores.

use super::chores::{recurrence_to_cron, ChoreResponse};
use super::ApiError;
use super::PaginatedResponse;
use allowance_service::chore_query::{list_chores, ListChoresQuery};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct ChoreQueryParams {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AssigneeResponse {
    pub id: Uuid,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct ChoreListItemResponse {
    #[serde(flatten)]
    pub chore: ChoreResponse,
    pub assignees: Vec<AssigneeResponse>,
}

/// `GET /api/v1/chores` — list all chores with optional description search and pagination.
pub async fn get_chores(
    State(pool): State<PgPool>,
    Query(params): Query<ChoreQueryParams>,
) -> Result<impl IntoResponse, ApiError> {
    let page = params.page.unwrap_or(1);
    let per_page = params.per_page.unwrap_or(20);

    let result = list_chores(
        &pool,
        ListChoresQuery {
            page,
            per_page,
            description: params.description,
        },
    )
    .await
    .map_err(ApiError::from)?;

    let items: Vec<ChoreListItemResponse> = result
        .chores
        .into_iter()
        .map(|item| ChoreListItemResponse {
            chore: ChoreResponse {
                id: item.chore.id.0,
                description: item.chore.description,
                value_cents: item.chore.value_cents,
                recurrence_cron: item.chore.recurrence.as_ref().map(recurrence_to_cron),
                is_active: item.chore.is_active,
                created_at: item.chore.created_at,
                updated_at: item.chore.updated_at,
            },
            assignees: item
                .assignees
                .into_iter()
                .map(|a| AssigneeResponse {
                    id: a.id.0,
                    name: a.name,
                })
                .collect(),
        })
        .collect();

    Ok((
        StatusCode::OK,
        Json(PaginatedResponse {
            items,
            total: result.total,
            page,
            per_page,
        }),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{self, Request},
        routing::get,
        Router,
    };
    use serde_json::{json, Value};
    use sqlx::PgPool;
    use tower::ServiceExt;

    fn app(pool: PgPool) -> Router {
        Router::new()
            .route("/api/v1/chores", get(get_chores))
            .with_state(pool)
    }

    async fn get_json(app: Router, path: &str) -> (StatusCode, Value) {
        let response = app
            .oneshot(
                Request::builder()
                    .method(http::Method::GET)
                    .uri(path)
                    .body(Body::empty())
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

    use allowance_test_helpers::{
        seed_assignment, seed_chore, seed_chore_with_recurrence, seed_inactive_chore, seed_person,
    };

    #[sqlx::test(migrations = "../../migrations")]
    async fn get_chores_includes_inactive_chores(pool: PgPool) {
        seed_chore(&pool, "Sweep porch", 100).await;
        seed_inactive_chore(&pool, "Retired chore", 150).await;

        let (status, body) = get_json(app(pool), "/api/v1/chores").await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["total"], json!(2));
        let items = body["items"].as_array().unwrap();
        assert_eq!(items.len(), 2);
        let retired = items
            .iter()
            .find(|item| item["description"] == json!("Retired chore"))
            .expect("inactive chore should still be returned");
        assert_eq!(retired["is_active"], json!(false));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn get_chores_returns_recurrence_cron_for_recurring_chore(pool: PgPool) {
        // Biweekly (not a `@`-named cron alias) is the variant most likely to drift
        // out of sync between the repo and API's independent `recurrence_to_cron`
        // implementations, per gh-19.
        seed_chore_with_recurrence(&pool, "Take out trash", 100, "0 0 1,15 * *").await;

        let (status, body) = get_json(app(pool), "/api/v1/chores").await;

        assert_eq!(status, StatusCode::OK);
        let items = body["items"].as_array().unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0]["recurrence_cron"], json!("0 0 1,15 * *"));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn get_chores_returns_paginated_response(pool: PgPool) {
        seed_chore(&pool, "Sweep porch", 100).await;
        seed_chore(&pool, "Wash dishes", 150).await;

        let (status, body) = get_json(app(pool), "/api/v1/chores").await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["total"], json!(2));
        assert_eq!(body["page"], json!(1));
        assert_eq!(body["per_page"], json!(20));
        assert_eq!(body["items"].as_array().unwrap().len(), 2);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn get_chores_returns_empty_items_when_no_chores(pool: PgPool) {
        let (status, body) = get_json(app(pool), "/api/v1/chores").await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["total"], json!(0));
        assert_eq!(body["items"].as_array().unwrap().len(), 0);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn get_chores_filters_by_description(pool: PgPool) {
        seed_chore(&pool, "Take out trash", 100).await;
        seed_chore(&pool, "Wash dishes", 150).await;

        let (status, body) = get_json(app(pool), "/api/v1/chores?description=trash").await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["total"], json!(1));
        let items = body["items"].as_array().unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0]["description"], json!("Take out trash"));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn get_chores_includes_assignees_with_id_and_name(pool: PgPool) {
        let chore = seed_chore(&pool, "Sweep porch", 100).await;
        let alice = seed_person(&pool, "Alice").await;
        seed_assignment(&pool, chore, alice).await;

        let (status, body) = get_json(app(pool), "/api/v1/chores").await;

        assert_eq!(status, StatusCode::OK);
        let assignees = body["items"][0]["assignees"].as_array().unwrap();
        assert_eq!(assignees.len(), 1);
        assert_eq!(assignees[0]["id"], json!(alice.to_string()));
        assert_eq!(assignees[0]["name"], json!("Alice"));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn get_chores_returns_empty_assignees_for_unassigned_chore(pool: PgPool) {
        seed_chore(&pool, "Sweep porch", 100).await;

        let (status, body) = get_json(app(pool), "/api/v1/chores").await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["items"][0]["assignees"], json!([]));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn get_chores_sorts_assignees_by_name(pool: PgPool) {
        let chore = seed_chore(&pool, "Sweep porch", 100).await;
        let bob = seed_person(&pool, "Bob").await;
        let alice = seed_person(&pool, "Alice").await;
        seed_assignment(&pool, chore, bob).await;
        seed_assignment(&pool, chore, alice).await;

        let (status, body) = get_json(app(pool), "/api/v1/chores").await;

        assert_eq!(status, StatusCode::OK);
        let names: Vec<&str> = body["items"][0]["assignees"]
            .as_array()
            .unwrap()
            .iter()
            .map(|a| a["name"].as_str().unwrap())
            .collect();
        assert_eq!(names, vec!["Alice", "Bob"]);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn get_chores_paginates_results(pool: PgPool) {
        seed_chore(&pool, "First", 100).await;
        seed_chore(&pool, "Second", 150).await;
        seed_chore(&pool, "Third", 200).await;

        let (status, body) = get_json(app(pool), "/api/v1/chores?page=2&per_page=2").await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["total"], json!(3));
        assert_eq!(body["page"], json!(2));
        assert_eq!(body["per_page"], json!(2));
        let items = body["items"].as_array().unwrap();
        assert_eq!(items.len(), 1);
    }
}
