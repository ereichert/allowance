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
use serde::Deserialize;
use sqlx::PgPool;

#[derive(Debug, Deserialize)]
pub struct ChoreQueryParams {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub description: Option<String>,
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

    let items: Vec<ChoreResponse> = result
        .chores
        .into_iter()
        .map(|c| ChoreResponse {
            id: c.id.0,
            description: c.description,
            value_cents: c.value_cents,
            recurrence_cron: c.recurrence.as_ref().map(recurrence_to_cron),
            is_active: c.is_active,
            created_at: c.created_at,
            updated_at: c.updated_at,
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

    use allowance_test_helpers::seed_chore;

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
