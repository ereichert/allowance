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

/// Lets tests control `is_active` and `recurrence_cron` directly, since GET /chores
/// intentionally includes deactivated chores and must also map a set recurrence
/// through `recurrence_to_cron`; both need to be seedable.
pub async fn insert_chore(
    pool: &PgPool,
    description: &str,
    value_cents: i64,
    is_active: bool,
    recurrence_cron: Option<&str>,
) -> Uuid {
    sqlx::query_scalar::<_, Uuid>(
        "INSERT INTO chores (description, value_cents, is_active, recurrence_cron) VALUES ($1, $2, $3, $4) RETURNING id",
    )
    .bind(description)
    .bind(value_cents)
    .bind(is_active)
    .bind(recurrence_cron)
    .fetch_one(pool)
    .await
    .unwrap()
}

/// Covers the common case (most fixtures just need an active, non-recurring chore)
/// so call sites don't repeat the active-state and recurrence arguments.
pub async fn seed_chore(pool: &PgPool, description: &str, value_cents: i64) -> Uuid {
    insert_chore(pool, description, value_cents, true, None).await
}

/// Lets tests exercise the intentional inclusion of deactivated chores in list
/// results without every caller passing `is_active` explicitly.
pub async fn seed_inactive_chore(pool: &PgPool, description: &str, value_cents: i64) -> Uuid {
    insert_chore(pool, description, value_cents, false, None).await
}

/// Lets tests exercise a chore with a recurrence set, since the non-null branch of
/// `recurrence_cron` mapping is otherwise never seeded. Takes the raw cron string so
/// callers can assert against either hand-written `recurrence_to_cron` implementation
/// without this helper depending on either one.
pub async fn seed_chore_with_recurrence(
    pool: &PgPool,
    description: &str,
    value_cents: i64,
    recurrence_cron: &str,
) -> Uuid {
    insert_chore(pool, description, value_cents, true, Some(recurrence_cron)).await
}

/// Bulk-seeds `count` active chores in a single INSERT so pagination tests can seed
/// past a page-size limit without one round trip per row.
pub async fn seed_many_chores(pool: &PgPool, count: i64, value_cents: i64) -> Vec<Uuid> {
    sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO chores (description, value_cents)
        SELECT 'Chore ' || gs, $2
        FROM generate_series(1, $1) AS gs
        RETURNING id
        "#,
    )
    .bind(count)
    .bind(value_cents)
    .fetch_all(pool)
    .await
    .unwrap()
}
