//! HTTP API layer for Allowance.
//!
//! This crate defines the Axum routes and handlers.
//! It depends on `allowance-service` for all business operations.

pub mod routes;

use axum::{http::{header, HeaderValue, Method}, routing::get, Router};
use sqlx::PgPool;
use tower_http::cors::CorsLayer;

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, http::Request};
    use tower::ServiceExt;

    #[sqlx::test(migrations = "../../migrations")]
    async fn cors_allow_origin_header_is_present_on_response(pool: PgPool) {
        let app = build_router(pool, "http://localhost:5173");

        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::OPTIONS)
                    .uri("/api/v1/people")
                    .header("Origin", "http://localhost:5173")
                    .header("Access-Control-Request-Method", "GET")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(
            response.headers().get("access-control-allow-origin").unwrap(),
            "http://localhost:5173",
        );
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn cors_does_not_reflect_unknown_origin(pool: PgPool) {
        let app = build_router(pool, "http://localhost:5173");

        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::OPTIONS)
                    .uri("/api/v1/people")
                    .header("Origin", "http://evil.example.com")
                    .header("Access-Control-Request-Method", "GET")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        let allow_origin = response
            .headers()
            .get("access-control-allow-origin")
            .map(|v| v.to_str().unwrap_or(""));
        assert_ne!(allow_origin, Some("http://evil.example.com"));
    }
}

/// Build and return the application router, wired to the given database pool.
pub fn build_router(pool: PgPool, cors_origin: &str) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(cors_origin.parse::<HeaderValue>().expect("invalid CORS origin"))
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([header::CONTENT_TYPE]);

    Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/api/v1/chores", axum::routing::post(routes::chores::post_chore))
        .route("/api/v1/people", get(routes::people::get_people))
        .with_state(pool)
        .layer(cors)
}
