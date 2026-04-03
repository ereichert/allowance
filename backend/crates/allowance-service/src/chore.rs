//! Service operations for chores.

pub use allowance_domain::NewChore;
use allowance_domain::{Chore, ChoreAssignment, NewChoreAssignment};
use allowance_types::PersonId;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::ServiceError;

/// Result of creating a chore with optional assignments.
#[derive(Debug)]
pub struct CreateChoreResult {
    pub chore: Chore,
    pub assignments: Vec<ChoreAssignment>,
}

/// Create a chore and optional assignments.
///
/// Validates the input and checks that all assignee IDs exist, then writes
/// the chore and assignments together in a single transaction.
pub async fn create_chore(
    pool: &PgPool,
    new_chore: NewChore,
    assignee_ids: Vec<Uuid>,
    due_at: Option<DateTime<Utc>>,
) -> Result<CreateChoreResult, ServiceError> {
    new_chore.validate()?;

    if !assignee_ids.is_empty() {
        let all_exist = allowance_repo::chore::all_people_exist(pool, &assignee_ids).await?;
        if !all_exist {
            return Err(ServiceError::UnknownAssignees);
        }
    }

    let mut tx = pool.begin().await.map_err(allowance_repo::RepoError::Database)?;

    let chore = allowance_repo::chore::insert_chore_tx(&mut tx, &new_chore).await?;

    let new_chore_assignments: Vec<NewChoreAssignment> = assignee_ids
        .iter()
        .map(|person_uuid| NewChoreAssignment {
            chore_id: chore.id,
            person_id: PersonId(*person_uuid),
            assigned_by: None,
            due_at,
        })
        .collect();

    let assignments =
        allowance_repo::chore::insert_assignments_bulk_tx(&mut tx, &new_chore_assignments).await?;

    tx.commit().await.map_err(allowance_repo::RepoError::Database)?;

    Ok(CreateChoreResult { chore, assignments })
}

#[cfg(test)]
mod tests {
    use super::*;
    use allowance_domain::NewChore;
    use allowance_test_helpers::seed_person;
    use sqlx::PgPool;

    fn input(description: &str) -> NewChore {
        NewChore::new(description, None, None)
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn create_chore_with_no_assignees_succeeds(pool: PgPool) {
        let result = create_chore(&pool, input("Sweep porch"), vec![], None).await.unwrap();
        assert_eq!(result.chore.description, "Sweep porch");
        assert!(result.assignments.is_empty());
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn create_chore_creates_one_assignment_per_assignee(pool: PgPool) {
        let alice = seed_person(&pool, "Alice").await;
        let bob = seed_person(&pool, "Bob").await;

        let new_chore = NewChore::new("Wash car", Some(300), None);
        let result = create_chore(&pool, new_chore, vec![alice, bob], None).await.unwrap();

        assert_eq!(result.chore.value_cents, 300);
        assert_eq!(result.assignments.len(), 2);
        let assigned_person_ids: Vec<Uuid> =
            result.assignments.iter().map(|a| a.person_id.0).collect();
        assert!(assigned_person_ids.contains(&alice));
        assert!(assigned_person_ids.contains(&bob));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn create_chore_stores_due_at_on_assignments(pool: PgPool) {
        let alice = seed_person(&pool, "Alice").await;
        let due = DateTime::parse_from_rfc3339("2026-04-10T09:00:00Z")
            .unwrap()
            .with_timezone(&Utc);

        let new_chore = NewChore::new("Take out bins", None, None);
        let result = create_chore(&pool, new_chore, vec![alice], Some(due)).await.unwrap();
        assert_eq!(result.assignments[0].due_at, Some(due));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn create_chore_rejects_blank_description(pool: PgPool) {
        let err = create_chore(&pool, input("  "), vec![], None).await.unwrap_err();
        assert!(matches!(err, ServiceError::Validation(_)));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn create_chore_rejects_unknown_assignee(pool: PgPool) {
        let new_chore = NewChore::new("Walk dog", None, None);
        let err = create_chore(&pool, new_chore, vec![Uuid::new_v4()], None).await.unwrap_err();
        assert!(matches!(err, ServiceError::UnknownAssignees));
    }
}
