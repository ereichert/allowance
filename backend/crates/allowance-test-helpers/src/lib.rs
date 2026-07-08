//! Shared test helpers for database-backed integration tests.

use sqlx::PgPool;
use uuid::Uuid;

/// Insert a person with the given name and role, returning their ID.
/// Uses a dynamic query to avoid compile-time issues binding custom PG enum types.
pub async fn insert_person(pool: &PgPool, name: &str, role: &str) -> Uuid {
    let sql = format!("INSERT INTO people (name, role) VALUES ($1, '{role}'::role) RETURNING id");
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

/// Insert a chore with the given description, value, and active status, returning its ID.
pub async fn insert_chore(
    pool: &PgPool,
    description: &str,
    value_cents: i64,
    is_active: bool,
) -> Uuid {
    sqlx::query_scalar::<_, Uuid>(
        "INSERT INTO chores (description, value_cents, is_active) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind(description)
    .bind(value_cents)
    .bind(is_active)
    .fetch_one(pool)
    .await
    .unwrap()
}

/// Insert an active chore with the given description and value, returning its ID.
pub async fn seed_chore(pool: &PgPool, description: &str, value_cents: i64) -> Uuid {
    insert_chore(pool, description, value_cents, true).await
}

/// Insert a deactivated chore with the given description and value, returning its ID.
pub async fn seed_inactive_chore(pool: &PgPool, description: &str, value_cents: i64) -> Uuid {
    insert_chore(pool, description, value_cents, false).await
}
