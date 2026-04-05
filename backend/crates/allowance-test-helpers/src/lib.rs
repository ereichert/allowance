//! Shared test helpers for database-backed integration tests.

use sqlx::PgPool;
use uuid::Uuid;

/// Insert a person with the given name and role, returning their ID.
/// Uses a dynamic query to avoid compile-time issues binding custom PG enum types.
pub async fn insert_person(pool: &PgPool, name: &str, role: &str) -> Uuid {
    let sql = format!(
        "INSERT INTO people (name, role) VALUES ($1, '{role}'::role) RETURNING id"
    );
    sqlx::query_scalar::<_, Uuid>(&sql)
        .bind(name)
        .fetch_one(pool)
        .await
        .unwrap()
}

/// Insert a person with the `Child` role, returning their ID.
pub async fn seed_person(pool: &PgPool, name: &str) -> Uuid {
    insert_person(pool, name, "Child").await
}
