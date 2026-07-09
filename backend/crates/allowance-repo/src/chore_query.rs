//! Read-path repository operations for listing and counting chores.

use std::collections::HashMap;

use allowance_domain::{Chore, ChoreAssignee, ChoreId, PersonId};
use sqlx::PgPool;
use uuid::Uuid;

use crate::chore::ChoreRow;
use crate::error::RepoError;

/// Input for filtering and paginating the chore list.
#[derive(Debug, Clone)]
pub struct ChoreFilter {
    pub limit: i64,
    pub offset: i64,
    pub description: Option<String>,
}

/// Fetch a filtered, paginated slice of chores ordered by most recently created first.
pub async fn list_chores(pool: &PgPool, filter: &ChoreFilter) -> Result<Vec<Chore>, RepoError> {
    let rows = sqlx::query_as!(
        ChoreRow,
        r#"
        SELECT id, description, value_cents, recurrence_cron, is_active, created_at, updated_at
        FROM chores
        WHERE ($1::text IS NULL OR description ILIKE '%' || $1 || '%')
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
        filter.description.as_deref(),
        filter.limit,
        filter.offset,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(Chore::from).collect())
}

/// Fetch the distinct assignees of each given chore in a single query, grouped by
/// chore and sorted by name. A person appears at most once per chore regardless of
/// how many assignment records they hold. Chores with no assignments are absent
/// from the map.
pub async fn list_assignees_for_chores(
    pool: &PgPool,
    chore_ids: &[ChoreId],
) -> Result<HashMap<ChoreId, Vec<ChoreAssignee>>, RepoError> {
    if chore_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let ids: Vec<Uuid> = chore_ids.iter().map(|c| c.0).collect();
    let rows = sqlx::query!(
        r#"
        SELECT DISTINCT ca.chore_id, p.id AS person_id, p.name
        FROM chore_assignments ca
        JOIN people p ON p.id = ca.person_id
        WHERE ca.chore_id = ANY($1)
        ORDER BY p.name, p.id
        "#,
        &ids,
    )
    .fetch_all(pool)
    .await?;

    let mut assignees_by_chore: HashMap<ChoreId, Vec<ChoreAssignee>> = HashMap::new();
    for row in rows {
        assignees_by_chore
            .entry(ChoreId(row.chore_id))
            .or_default()
            .push(ChoreAssignee {
                id: PersonId(row.person_id),
                name: row.name,
            });
    }

    Ok(assignees_by_chore)
}

/// Count chores matching the optional description filter (used for pagination totals).
pub async fn count_chores(pool: &PgPool, description: Option<&str>) -> Result<i64, RepoError> {
    let count = sqlx::query_scalar!(
        r#"SELECT COUNT(*) AS "count!" FROM chores
           WHERE ($1::text IS NULL OR description ILIKE '%' || $1 || '%')"#,
        description,
    )
    .fetch_one(pool)
    .await?;

    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;

    use allowance_test_helpers::{
        insert_assignment, seed_assignment, seed_chore, seed_inactive_chore, seed_person,
    };

    fn all_filter() -> ChoreFilter {
        ChoreFilter {
            limit: 100,
            offset: 0,
            description: None,
        }
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_chores_returns_all_rows(pool: PgPool) {
        seed_chore(&pool, "Sweep porch", 100).await;
        seed_chore(&pool, "Wash dishes", 150).await;

        let chores = list_chores(&pool, &all_filter()).await.unwrap();
        assert_eq!(chores.len(), 2);

        let descriptions: Vec<&str> = chores.iter().map(|c| c.description.as_str()).collect();
        assert!(descriptions.contains(&"Sweep porch"));
        assert!(descriptions.contains(&"Wash dishes"));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_chores_includes_inactive_chores(pool: PgPool) {
        seed_chore(&pool, "Sweep porch", 100).await;
        seed_inactive_chore(&pool, "Retired chore", 150).await;

        let chores = list_chores(&pool, &all_filter()).await.unwrap();
        assert_eq!(chores.len(), 2);

        let retired = chores
            .iter()
            .find(|c| c.description == "Retired chore")
            .expect("inactive chore should still be returned");
        assert!(!retired.is_active);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_chores_returns_empty_when_no_rows(pool: PgPool) {
        let chores = list_chores(&pool, &all_filter()).await.unwrap();
        assert!(chores.is_empty());
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_chores_filters_by_partial_description(pool: PgPool) {
        seed_chore(&pool, "Take out trash", 100).await;
        seed_chore(&pool, "Wash dishes", 150).await;

        let filter = ChoreFilter {
            limit: 100,
            offset: 0,
            description: Some("trash".to_string()),
        };
        let chores = list_chores(&pool, &filter).await.unwrap();
        assert_eq!(chores.len(), 1);
        assert_eq!(chores[0].description, "Take out trash");
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_chores_description_filter_is_case_insensitive(pool: PgPool) {
        seed_chore(&pool, "Take out trash", 100).await;

        let filter = ChoreFilter {
            limit: 100,
            offset: 0,
            description: Some("TRASH".to_string()),
        };
        let chores = list_chores(&pool, &filter).await.unwrap();
        assert_eq!(chores.len(), 1);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_chores_filter_with_no_match_returns_empty(pool: PgPool) {
        seed_chore(&pool, "Take out trash", 100).await;

        let filter = ChoreFilter {
            limit: 100,
            offset: 0,
            description: Some("zzz".to_string()),
        };
        let chores = list_chores(&pool, &filter).await.unwrap();
        assert!(chores.is_empty());
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_chores_respects_limit(pool: PgPool) {
        seed_chore(&pool, "Sweep porch", 100).await;
        seed_chore(&pool, "Wash dishes", 150).await;
        seed_chore(&pool, "Mow lawn", 200).await;

        let filter = ChoreFilter {
            limit: 2,
            offset: 0,
            description: None,
        };
        let chores = list_chores(&pool, &filter).await.unwrap();
        assert_eq!(chores.len(), 2);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_chores_respects_offset(pool: PgPool) {
        seed_chore(&pool, "First", 100).await;
        seed_chore(&pool, "Second", 150).await;
        seed_chore(&pool, "Third", 200).await;

        let filter = ChoreFilter {
            limit: 100,
            offset: 1,
            description: None,
        };
        let chores = list_chores(&pool, &filter).await.unwrap();
        assert_eq!(chores.len(), 2);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_chores_offset_beyond_row_count_returns_empty(pool: PgPool) {
        seed_chore(&pool, "Sweep porch", 100).await;

        let filter = ChoreFilter {
            limit: 100,
            offset: 10,
            description: None,
        };
        let chores = list_chores(&pool, &filter).await.unwrap();
        assert!(chores.is_empty());
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_chores_orders_newest_first(pool: PgPool) {
        // Explicit, well-separated created_at values so ordering is deterministic
        // regardless of how fast the inserts execute.
        sqlx::query!(
            r#"INSERT INTO chores (description, value_cents, created_at) VALUES
               ('First', 100, now() - interval '2 minutes'),
               ('Second', 150, now() - interval '1 minute'),
               ('Third', 200, now())"#,
        )
        .execute(&pool)
        .await
        .unwrap();

        let chores = list_chores(&pool, &all_filter()).await.unwrap();
        assert_eq!(chores[0].description, "Third");
        assert_eq!(chores[1].description, "Second");
        assert_eq!(chores[2].description, "First");
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn count_chores_returns_total(pool: PgPool) {
        seed_chore(&pool, "Sweep porch", 100).await;
        seed_chore(&pool, "Wash dishes", 150).await;

        let total = count_chores(&pool, None).await.unwrap();
        assert_eq!(total, 2);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn count_chores_filters_by_partial_description(pool: PgPool) {
        seed_chore(&pool, "Take out trash", 100).await;
        seed_chore(&pool, "Take out recycling", 100).await;
        seed_chore(&pool, "Wash dishes", 150).await;

        let total = count_chores(&pool, Some("take out")).await.unwrap();
        assert_eq!(total, 2);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn count_chores_includes_inactive_chores(pool: PgPool) {
        seed_chore(&pool, "Sweep porch", 100).await;
        seed_inactive_chore(&pool, "Retired chore", 150).await;

        let total = count_chores(&pool, None).await.unwrap();
        assert_eq!(total, 2);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn count_chores_returns_zero_for_non_matching_filter(pool: PgPool) {
        seed_chore(&pool, "Sweep porch", 100).await;

        let total = count_chores(&pool, Some("zzz")).await.unwrap();
        assert_eq!(total, 0);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn count_chores_returns_zero_when_empty(pool: PgPool) {
        let total = count_chores(&pool, None).await.unwrap();
        assert_eq!(total, 0);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_assignees_for_chores_returns_empty_map_for_no_chore_ids(pool: PgPool) {
        let assignees = list_assignees_for_chores(&pool, &[]).await.unwrap();
        assert!(assignees.is_empty());
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_assignees_for_chores_groups_assignees_by_chore(pool: PgPool) {
        let sweep = seed_chore(&pool, "Sweep porch", 100).await;
        let wash = seed_chore(&pool, "Wash dishes", 150).await;
        let alice = seed_person(&pool, "Alice").await;
        let bob = seed_person(&pool, "Bob").await;
        seed_assignment(&pool, sweep, alice).await;
        seed_assignment(&pool, wash, bob).await;

        let assignees = list_assignees_for_chores(&pool, &[ChoreId(sweep), ChoreId(wash)])
            .await
            .unwrap();

        assert_eq!(
            assignees[&ChoreId(sweep)],
            vec![ChoreAssignee {
                id: PersonId(alice),
                name: "Alice".to_string(),
            }]
        );
        assert_eq!(
            assignees[&ChoreId(wash)],
            vec![ChoreAssignee {
                id: PersonId(bob),
                name: "Bob".to_string(),
            }]
        );
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_assignees_for_chores_omits_chores_without_assignments(pool: PgPool) {
        let chore = seed_chore(&pool, "Sweep porch", 100).await;

        let assignees = list_assignees_for_chores(&pool, &[ChoreId(chore)])
            .await
            .unwrap();

        assert!(assignees.is_empty());
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_assignees_for_chores_deduplicates_repeat_assignments(pool: PgPool) {
        let chore = seed_chore(&pool, "Sweep porch", 100).await;
        let alice = seed_person(&pool, "Alice").await;
        insert_assignment(&pool, chore, alice, "Completed").await;
        seed_assignment(&pool, chore, alice).await;

        let assignees = list_assignees_for_chores(&pool, &[ChoreId(chore)])
            .await
            .unwrap();

        assert_eq!(assignees[&ChoreId(chore)].len(), 1);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_assignees_for_chores_includes_every_assignment_status(pool: PgPool) {
        let chore = seed_chore(&pool, "Sweep porch", 100).await;
        let statuses = [
            ("Alice", "Pending"),
            ("Bob", "Completed"),
            ("Cara", "Verified"),
            ("Dan", "Skipped"),
        ];
        for (name, status) in statuses {
            let person = seed_person(&pool, name).await;
            insert_assignment(&pool, chore, person, status).await;
        }

        let assignees = list_assignees_for_chores(&pool, &[ChoreId(chore)])
            .await
            .unwrap();

        assert_eq!(assignees[&ChoreId(chore)].len(), 4);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_assignees_for_chores_sorts_assignees_by_name(pool: PgPool) {
        let chore = seed_chore(&pool, "Sweep porch", 100).await;
        let cara = seed_person(&pool, "Cara").await;
        let alice = seed_person(&pool, "Alice").await;
        let bob = seed_person(&pool, "Bob").await;
        seed_assignment(&pool, chore, cara).await;
        seed_assignment(&pool, chore, alice).await;
        seed_assignment(&pool, chore, bob).await;

        let assignees = list_assignees_for_chores(&pool, &[ChoreId(chore)])
            .await
            .unwrap();

        let names: Vec<&str> = assignees[&ChoreId(chore)]
            .iter()
            .map(|a| a.name.as_str())
            .collect();
        assert_eq!(names, vec!["Alice", "Bob", "Cara"]);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_assignees_for_chores_excludes_unrequested_chores(pool: PgPool) {
        let requested = seed_chore(&pool, "Sweep porch", 100).await;
        let other = seed_chore(&pool, "Wash dishes", 150).await;
        let alice = seed_person(&pool, "Alice").await;
        seed_assignment(&pool, requested, alice).await;
        seed_assignment(&pool, other, alice).await;

        let assignees = list_assignees_for_chores(&pool, &[ChoreId(requested)])
            .await
            .unwrap();

        assert_eq!(assignees.len(), 1);
        assert!(assignees.contains_key(&ChoreId(requested)));
    }
}
