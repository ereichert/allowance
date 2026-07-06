//! Repository operations for chores and their assignments.

use allowance_domain::{
    AssignmentId, AssignmentStatus, Chore, ChoreAssignment, ChoreId, NewChore, NewChoreAssignment,
    PersonId, Recurrence,
};
use chrono::{DateTime, Utc};
use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

use crate::error::RepoError;

/// Canonical cron expressions for named recurrence variants.
/// `Custom` stores its expression directly; all others use these sentinels.
const CRON_DAILY: &str = "@daily";
const CRON_WEEKLY: &str = "@weekly";
const CRON_BIWEEKLY: &str = "0 0 1,15 * *";
const CRON_MONTHLY: &str = "@monthly";

/// Convert a stored cron string back to a `Recurrence` variant.
/// Unrecognized expressions are treated as `Custom`.
fn cron_to_recurrence(cron: &str) -> Recurrence {
    match cron {
        CRON_DAILY => Recurrence::Daily,
        CRON_WEEKLY => Recurrence::Weekly,
        CRON_BIWEEKLY => Recurrence::Biweekly,
        CRON_MONTHLY => Recurrence::Monthly,
        other => Recurrence::Custom(other.to_string()),
    }
}

pub(crate) struct ChoreRow {
    pub(crate) id: Uuid,
    pub(crate) description: String,
    pub(crate) value_cents: i64,
    pub(crate) recurrence_cron: Option<String>,
    pub(crate) is_active: bool,
    pub(crate) created_at: DateTime<Utc>,
    pub(crate) updated_at: DateTime<Utc>,
}

impl From<ChoreRow> for Chore {
    fn from(row: ChoreRow) -> Self {
        let recurrence = row.recurrence_cron.as_deref().map(cron_to_recurrence);
        Chore {
            id: ChoreId(row.id),
            description: row.description,
            value_cents: row.value_cents,
            recurrence,
            is_active: row.is_active,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

struct AssignmentRow {
    id: Uuid,
    chore_id: Uuid,
    person_id: Uuid,
    assigned_by: Option<Uuid>,
    status: String,
    due_at: Option<DateTime<Utc>>,
    completed_at: Option<DateTime<Utc>>,
    created_at: DateTime<Utc>,
}

impl TryFrom<AssignmentRow> for ChoreAssignment {
    type Error = RepoError;

    fn try_from(row: AssignmentRow) -> Result<Self, Self::Error> {
        let status = match row.status.as_str() {
            "Pending" => AssignmentStatus::Pending,
            "Completed" => AssignmentStatus::Completed,
            "Verified" => AssignmentStatus::Verified,
            "Skipped" => AssignmentStatus::Skipped,
            other => {
                return Err(RepoError::Database(sqlx::Error::Decode(
                    format!("unknown assignment_status value: {other}").into(),
                )))
            }
        };
        Ok(ChoreAssignment {
            id: AssignmentId(row.id),
            chore_id: ChoreId(row.chore_id),
            person_id: PersonId(row.person_id),
            assigned_by: row.assigned_by.map(PersonId),
            status,
            due_at: row.due_at,
            completed_at: row.completed_at,
            created_at: row.created_at,
        })
    }
}

pub async fn insert_chore_tx(
    tx: &mut Transaction<'_, Postgres>,
    new_chore: &NewChore,
) -> Result<Chore, RepoError> {
    let row = sqlx::query_as!(
        ChoreRow,
        r#"
        INSERT INTO chores (description, value_cents)
        VALUES ($1, $2)
        RETURNING id, description, value_cents, recurrence_cron, is_active, created_at, updated_at
        "#,
        new_chore.description(),
        new_chore.value_cents(),
    )
    .fetch_one(&mut **tx)
    .await?;

    Ok(Chore::from(row))
}

/// Bulk-insert chore assignments within an open transaction using UNNEST.
/// Returns assignments in the same order as the new assignments.
pub async fn insert_assignments_bulk_tx(
    tx: &mut Transaction<'_, Postgres>,
    new_chore_assignments: &[NewChoreAssignment],
) -> Result<Vec<ChoreAssignment>, RepoError> {
    if new_chore_assignments.is_empty() {
        return Ok(vec![]);
    }

    let chore_ids: Vec<Uuid> = new_chore_assignments.iter().map(|a| a.chore_id.0).collect();
    let person_ids: Vec<Uuid> = new_chore_assignments
        .iter()
        .map(|a| a.person_id.0)
        .collect();
    let assigned_bys: Vec<Option<Uuid>> = new_chore_assignments
        .iter()
        .map(|a| a.assigned_by.map(|p| p.0))
        .collect();
    let due_ats: Vec<Option<DateTime<Utc>>> =
        new_chore_assignments.iter().map(|a| a.due_at).collect();

    let rows = sqlx::query_as!(
        AssignmentRow,
        r#"
        INSERT INTO chore_assignments (chore_id, person_id, assigned_by, due_at)
        SELECT * FROM UNNEST($1::uuid[], $2::uuid[], $3::uuid[], $4::timestamptz[])
        RETURNING id, chore_id, person_id, assigned_by,
                  status::text AS "status!",
                  due_at, completed_at, created_at
        "#,
        &chore_ids,
        &person_ids,
        &assigned_bys as &[Option<Uuid>],
        &due_ats as &[Option<DateTime<Utc>>],
    )
    .fetch_all(&mut **tx)
    .await?;

    rows.into_iter().map(ChoreAssignment::try_from).collect()
}

/// Return true if every UUID in `ids` corresponds to an existing person.
pub async fn all_people_exist(pool: &PgPool, ids: &[Uuid]) -> Result<bool, RepoError> {
    if ids.is_empty() {
        return Ok(true);
    }
    let count = sqlx::query_scalar!(
        r#"SELECT COUNT(*) AS "count!" FROM people WHERE id = ANY($1)"#,
        ids
    )
    .fetch_one(pool)
    .await?;

    Ok(count == ids.len() as i64)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::PgPool;

    /// Write direction of the cron conversion — only needed in tests for round-trip assertions.
    fn recurrence_to_cron(r: &Recurrence) -> String {
        match r {
            Recurrence::Daily => CRON_DAILY.to_string(),
            Recurrence::Weekly => CRON_WEEKLY.to_string(),
            Recurrence::Biweekly => CRON_BIWEEKLY.to_string(),
            Recurrence::Monthly => CRON_MONTHLY.to_string(),
            Recurrence::Custom(expr) => expr.clone(),
        }
    }

    use allowance_test_helpers::seed_person;

    #[test]
    fn daily_round_trips_through_cron() {
        assert_eq!(
            cron_to_recurrence(&recurrence_to_cron(&Recurrence::Daily)),
            Recurrence::Daily
        );
    }

    #[test]
    fn weekly_round_trips_through_cron() {
        assert_eq!(
            cron_to_recurrence(&recurrence_to_cron(&Recurrence::Weekly)),
            Recurrence::Weekly
        );
    }

    #[test]
    fn biweekly_round_trips_through_cron() {
        assert_eq!(
            cron_to_recurrence(&recurrence_to_cron(&Recurrence::Biweekly)),
            Recurrence::Biweekly
        );
    }

    #[test]
    fn monthly_round_trips_through_cron() {
        assert_eq!(
            cron_to_recurrence(&recurrence_to_cron(&Recurrence::Monthly)),
            Recurrence::Monthly
        );
    }

    #[test]
    fn custom_round_trips_through_cron() {
        let expr = "0 9 * * 1-5";
        assert_eq!(
            cron_to_recurrence(&recurrence_to_cron(&Recurrence::Custom(expr.to_string()))),
            Recurrence::Custom(expr.to_string()),
        );
    }

    #[test]
    fn unknown_cron_string_becomes_custom() {
        assert_eq!(
            cron_to_recurrence("5 4 * * sun"),
            Recurrence::Custom("5 4 * * sun".to_string()),
        );
    }

    fn new_chore(description: &str, value_cents: Option<i64>) -> NewChore {
        NewChore::new(description, value_cents, None)
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn insert_chore_tx_persists_description_and_value(pool: PgPool) {
        let mut tx = pool.begin().await.unwrap();
        let chore = insert_chore_tx(&mut tx, &new_chore("Wash dishes", Some(150)))
            .await
            .unwrap();
        tx.commit().await.unwrap();

        assert_eq!(chore.description, "Wash dishes");
        assert_eq!(chore.value_cents, 150);
        assert!(chore.is_active);
        assert!(chore.recurrence.is_none());
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn insert_chore_tx_with_zero_value(pool: PgPool) {
        let mut tx = pool.begin().await.unwrap();
        let chore = insert_chore_tx(&mut tx, &new_chore("Tidy room", Some(0)))
            .await
            .unwrap();
        tx.commit().await.unwrap();

        assert_eq!(chore.value_cents, 0);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn insert_assignments_bulk_tx_creates_pending_records(pool: PgPool) {
        let mut tx = pool.begin().await.unwrap();
        let chore = insert_chore_tx(&mut tx, &new_chore("Vacuum", Some(200)))
            .await
            .unwrap();
        tx.commit().await.unwrap();

        let person_id = seed_person(&pool, "Alice").await;

        let mut tx = pool.begin().await.unwrap();
        let new_assignments = vec![NewChoreAssignment {
            chore_id: chore.id,
            person_id: PersonId(person_id),
            assigned_by: None,
            due_at: None,
        }];
        let assignments = insert_assignments_bulk_tx(&mut tx, &new_assignments)
            .await
            .unwrap();
        tx.commit().await.unwrap();

        assert_eq!(assignments.len(), 1);
        assert_eq!(assignments[0].chore_id, chore.id);
        assert_eq!(assignments[0].person_id, PersonId(person_id));
        assert_eq!(assignments[0].status, AssignmentStatus::Pending);
        assert!(assignments[0].due_at.is_none());
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn insert_assignments_bulk_tx_stores_due_at(pool: PgPool) {
        let mut tx = pool.begin().await.unwrap();
        let chore = insert_chore_tx(&mut tx, &new_chore("Mow lawn", Some(500)))
            .await
            .unwrap();
        tx.commit().await.unwrap();

        let person_id = seed_person(&pool, "Bob").await;
        let due = DateTime::parse_from_rfc3339("2026-04-05T18:00:00Z")
            .unwrap()
            .with_timezone(&Utc);

        let mut tx = pool.begin().await.unwrap();
        let new_assignments = vec![NewChoreAssignment {
            chore_id: chore.id,
            person_id: PersonId(person_id),
            assigned_by: None,
            due_at: Some(due),
        }];
        let assignments = insert_assignments_bulk_tx(&mut tx, &new_assignments)
            .await
            .unwrap();
        tx.commit().await.unwrap();

        assert_eq!(assignments[0].due_at, Some(due));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn insert_assignments_bulk_tx_inserts_multiple_rows(pool: PgPool) {
        let mut tx = pool.begin().await.unwrap();
        let chore = insert_chore_tx(&mut tx, &new_chore("Sweep", Some(100)))
            .await
            .unwrap();
        tx.commit().await.unwrap();

        let alice = seed_person(&pool, "Alice").await;
        let bob = seed_person(&pool, "Bob").await;

        let mut tx = pool.begin().await.unwrap();
        let new_assignments = vec![
            NewChoreAssignment {
                chore_id: chore.id,
                person_id: PersonId(alice),
                assigned_by: None,
                due_at: None,
            },
            NewChoreAssignment {
                chore_id: chore.id,
                person_id: PersonId(bob),
                assigned_by: None,
                due_at: None,
            },
        ];
        let assignments = insert_assignments_bulk_tx(&mut tx, &new_assignments)
            .await
            .unwrap();
        tx.commit().await.unwrap();

        assert_eq!(assignments.len(), 2);
        let person_ids: Vec<Uuid> = assignments.iter().map(|a| a.person_id.0).collect();
        assert!(person_ids.contains(&alice));
        assert!(person_ids.contains(&bob));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn insert_assignments_bulk_tx_returns_empty_for_no_inputs(pool: PgPool) {
        let mut tx = pool.begin().await.unwrap();
        let assignments = insert_assignments_bulk_tx(&mut tx, &[]).await.unwrap();
        tx.commit().await.unwrap();
        assert!(assignments.is_empty());
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn all_people_exist_returns_true_when_all_present(pool: PgPool) {
        let id1 = seed_person(&pool, "Alice").await;
        let id2 = seed_person(&pool, "Bob").await;
        assert!(all_people_exist(&pool, &[id1, id2]).await.unwrap());
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn all_people_exist_returns_false_for_unknown_id(pool: PgPool) {
        let id1 = seed_person(&pool, "Alice").await;
        let unknown = Uuid::new_v4();
        assert!(!all_people_exist(&pool, &[id1, unknown]).await.unwrap());
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn all_people_exist_returns_true_for_empty_slice(pool: PgPool) {
        assert!(all_people_exist(&pool, &[]).await.unwrap());
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn all_people_exist_returns_false_when_all_ids_unknown(pool: PgPool) {
        assert!(!all_people_exist(&pool, &[Uuid::new_v4(), Uuid::new_v4()])
            .await
            .unwrap());
    }

    #[test]
    fn try_from_assignment_row_returns_error_for_unknown_status() {
        let row = AssignmentRow {
            id: Uuid::new_v4(),
            chore_id: Uuid::new_v4(),
            person_id: Uuid::new_v4(),
            assigned_by: None,
            status: "Deleted".to_string(),
            due_at: None,
            completed_at: None,
            created_at: chrono::Utc::now(),
        };
        assert!(matches!(
            ChoreAssignment::try_from(row),
            Err(RepoError::Database(_))
        ));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn insert_chore_tx_does_not_persist_on_rollback(pool: PgPool) {
        let mut tx = pool.begin().await.unwrap();
        insert_chore_tx(&mut tx, &new_chore("Ghost chore", None))
            .await
            .unwrap();
        tx.rollback().await.unwrap();

        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM chores")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count, 0);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn insert_assignments_bulk_tx_returns_error_for_nonexistent_chore(pool: PgPool) {
        let person_id = seed_person(&pool, "Alice").await;

        let mut tx = pool.begin().await.unwrap();
        let new_assignments = vec![NewChoreAssignment {
            chore_id: ChoreId(Uuid::new_v4()),
            person_id: PersonId(person_id),
            assigned_by: None,
            due_at: None,
        }];
        let result = insert_assignments_bulk_tx(&mut tx, &new_assignments).await;
        assert!(matches!(result, Err(RepoError::Database(_))));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn insert_assignments_bulk_tx_returns_error_for_nonexistent_person(pool: PgPool) {
        let mut tx = pool.begin().await.unwrap();
        let chore = insert_chore_tx(&mut tx, &new_chore("Clean", None))
            .await
            .unwrap();
        tx.commit().await.unwrap();

        let mut tx = pool.begin().await.unwrap();
        let new_assignments = vec![NewChoreAssignment {
            chore_id: chore.id,
            person_id: PersonId(Uuid::new_v4()),
            assigned_by: None,
            due_at: None,
        }];
        let result = insert_assignments_bulk_tx(&mut tx, &new_assignments).await;
        assert!(matches!(result, Err(RepoError::Database(_))));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn insert_assignments_bulk_tx_stores_assigned_by(pool: PgPool) {
        let mut tx = pool.begin().await.unwrap();
        let chore = insert_chore_tx(&mut tx, &new_chore("Cook dinner", None))
            .await
            .unwrap();
        tx.commit().await.unwrap();

        let alice = seed_person(&pool, "Alice").await;
        let bob = seed_person(&pool, "Bob").await;

        let mut tx = pool.begin().await.unwrap();
        let new_assignments = vec![NewChoreAssignment {
            chore_id: chore.id,
            person_id: PersonId(alice),
            assigned_by: Some(PersonId(bob)),
            due_at: None,
        }];
        let assignments = insert_assignments_bulk_tx(&mut tx, &new_assignments)
            .await
            .unwrap();
        tx.commit().await.unwrap();

        assert_eq!(assignments[0].assigned_by, Some(PersonId(bob)));
    }
}
