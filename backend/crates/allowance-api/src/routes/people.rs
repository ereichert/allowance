//! Handlers for people-related API endpoints.

use super::ApiError;
use allowance_service::person::{list_people, ListPeopleQuery};
use allowance_types::Role;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;


#[derive(Debug, Deserialize)]
pub struct PeopleQueryParams {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T: Serialize> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}

#[derive(Debug, Serialize)]
pub struct PersonResponse {
    pub id: Uuid,
    pub name: String,
    pub role: String,
    pub created_at: DateTime<Utc>,
}


/// `GET /api/v1/people` — list people with optional name search and pagination.
pub async fn get_people(
    State(pool): State<PgPool>,
    Query(params): Query<PeopleQueryParams>,
) -> Result<impl IntoResponse, ApiError> {
    let page = params.page.unwrap_or(1);
    let per_page = params.per_page.unwrap_or(20);

    let result = list_people(
        &pool,
        ListPeopleQuery { page, per_page, name: params.name },
    )
    .await
    .map_err(ApiError::from)?;

    let items: Vec<PersonResponse> = result
        .people
        .into_iter()
        .map(|p| PersonResponse {
            id: p.id.0,
            name: p.name,
            role: match p.role {
                Role::Admin => "Admin".to_string(),
                Role::Child => "Child".to_string(),
            },
            created_at: p.created_at,
        })
        .collect();

    Ok((
        StatusCode::OK,
        Json(PaginatedResponse { items, total: result.total, page, per_page }),
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
            .route("/api/v1/people", get(get_people))
            .with_state(pool)
    }

    async fn get_json(app: Router, path: &str) -> (axum::http::StatusCode, Value) {
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

    use allowance_test_helpers::seed_person;

#[sqlx::test(migrations = "../../migrations")]
    async fn get_people_returns_paginated_response(pool: PgPool) {
        seed_person(&pool, "Alice").await;
        seed_person(&pool, "Bob").await;

        let (status, body) = get_json(app(pool), "/api/v1/people").await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["total"], json!(2));
        assert_eq!(body["page"], json!(1));
        assert_eq!(body["per_page"], json!(20));
        assert_eq!(body["items"].as_array().unwrap().len(), 2);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn get_people_returns_empty_items_when_no_people(pool: PgPool) {
        let (status, body) = get_json(app(pool), "/api/v1/people").await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["total"], json!(0));
        assert_eq!(body["items"].as_array().unwrap().len(), 0);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn get_people_filters_by_name(pool: PgPool) {
        seed_person(&pool, "Alice").await;
        seed_person(&pool, "Bob").await;

        let (status, body) = get_json(app(pool), "/api/v1/people?name=ali").await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["total"], json!(1));
        let items = body["items"].as_array().unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0]["name"], json!("Alice"));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn get_people_paginates_results(pool: PgPool) {
        seed_person(&pool, "Alice").await;
        seed_person(&pool, "Bob").await;
        seed_person(&pool, "Carol").await;

        let (status, body) = get_json(app(pool), "/api/v1/people?page=2&per_page=2").await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["total"], json!(3));
        assert_eq!(body["page"], json!(2));
        assert_eq!(body["per_page"], json!(2));
        let items = body["items"].as_array().unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0]["name"], json!("Carol"));
    }
}
