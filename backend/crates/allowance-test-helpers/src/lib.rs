//! Shared test helpers for database-backed integration tests.

use sqlx::PgPool;
use uuid::Uuid;

/// Lets tests set up a person with a specific role directly, bypassing the API/service
/// layers. Binds via a dynamic query because sqlx's compile-time query checking can't
/// bind custom Postgres enum types.
pub async fn insert_person(pool: &PgPool, name: &str, role: &str) -> Uuid {
    let sql = format!("INSERT INTO people (name, role) VALUES ($1, '{role}'::role) RETURNING id");
    sqlx::query_scalar::<_, Uuid>(&sql)
        .bind(name)
        .fetch_one(pool)
        .await
        .unwrap()
}

/// Covers the common case (most fixtures just need a child) so call sites don't
/// repeat the role argument.
pub async fn seed_person(pool: &PgPool, name: &str) -> Uuid {
    insert_person(pool, name, "Child").await
}

/// Lets tests control `is_active` directly, since GET /chores intentionally includes
/// deactivated chores (see gh-18) and both states need to be seedable.
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

/// Covers the common case (most fixtures just need an active chore) so call sites
/// don't repeat the active-state argument.
pub async fn seed_chore(pool: &PgPool, description: &str, value_cents: i64) -> Uuid {
    insert_chore(pool, description, value_cents, true).await
}

/// Lets tests exercise the intentional inclusion of deactivated chores in list
/// results (gh-18) without every caller passing `is_active` explicitly.
pub async fn seed_inactive_chore(pool: &PgPool, description: &str, value_cents: i64) -> Uuid {
    insert_chore(pool, description, value_cents, false).await
}
