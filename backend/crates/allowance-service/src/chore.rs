//! Service operations for chores.

use allowance_domain::{
    Chore, ChoreAssignee, ChoreAssignment, ChoreId, NewChoreAssignment, PersonId,
};
pub use allowance_domain::{ChoreUpdate, NewChore};
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

    let mut tx = pool
        .begin()
        .await
        .map_err(allowance_repo::RepoError::Database)?;

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

    tx.commit()
        .await
        .map_err(allowance_repo::RepoError::Database)?;

    Ok(CreateChoreResult { chore, assignments })
}

/// `assignees` follows the same "distinct people, any status" contract as `GET /chores`.
#[derive(Debug)]
pub struct UpdateChoreResult {
    pub chore: Chore,
    pub assignees: Vec<ChoreAssignee>,
}

/// Update a chore's fields and reconcile its assignees to `assignee_ids`.
///
/// Assignees present in `assignee_ids` but not currently assigned get a new
/// `Pending` assignment; assignees currently assigned but absent from
/// `assignee_ids` have only their `Pending` rows removed — Completed/Verified/
/// Skipped rows are left alone, so a person may still appear in the returned
/// list after being unchecked.
pub async fn update_chore(
    pool: &PgPool,
    chore_id: ChoreId,
    update: ChoreUpdate,
    assignee_ids: Vec<Uuid>,
) -> Result<UpdateChoreResult, ServiceError> {
    update.validate()?;

    if !assignee_ids.is_empty() {
        let all_exist = allowance_repo::chore::all_people_exist(pool, &assignee_ids).await?;
        if !all_exist {
            return Err(ServiceError::UnknownAssignees);
        }
    }

    let mut tx = pool
        .begin()
        .await
        .map_err(allowance_repo::RepoError::Database)?;

    let chore = allowance_repo::chore::update_chore_tx(&mut tx, chore_id, &update)
        .await?
        .ok_or(ServiceError::NotFound)?;

    let current_ids =
        allowance_repo::chore::current_assignee_person_ids_tx(&mut tx, chore_id).await?;

    let to_add: Vec<NewChoreAssignment> = assignee_ids
        .iter()
        .filter(|id| !current_ids.contains(id))
        .map(|person_uuid| NewChoreAssignment {
            chore_id,
            person_id: PersonId(*person_uuid),
            assigned_by: None,
            due_at: None,
        })
        .collect();
    allowance_repo::chore::insert_assignments_bulk_tx(&mut tx, &to_add).await?;

    let to_remove: Vec<Uuid> = current_ids
        .into_iter()
        .filter(|id| !assignee_ids.contains(id))
        .collect();
    allowance_repo::chore::delete_pending_assignments_tx(&mut tx, chore_id, &to_remove).await?;

    tx.commit()
        .await
        .map_err(allowance_repo::RepoError::Database)?;

    let mut assignees_by_chore =
        allowance_repo::chore_query::list_assignees_for_chores(pool, &[chore_id]).await?;
    let assignees = assignees_by_chore.remove(&chore_id).unwrap_or_default();

    Ok(UpdateChoreResult { chore, assignees })
}

#[cfg(test)]
mod tests {
    use super::*;
    use allowance_domain::{NewChore, Recurrence};
    use allowance_test_helpers::{insert_assignment, seed_chore, seed_person};
    use sqlx::PgPool;

    fn input(description: &str) -> NewChore {
        NewChore::new(description, None, None)
    }

    fn update(description: &str, value_cents: i64, is_active: bool) -> ChoreUpdate {
        ChoreUpdate::new(description, value_cents, None, is_active)
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn create_chore_with_no_assignees_succeeds(pool: PgPool) {
        let result = create_chore(&pool, input("Sweep porch"), vec![], None)
            .await
            .unwrap();
        assert_eq!(result.chore.description, "Sweep porch");
        assert!(result.assignments.is_empty());
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn create_chore_creates_one_assignment_per_assignee(pool: PgPool) {
        let alice = seed_person(&pool, "Alice").await;
        let bob = seed_person(&pool, "Bob").await;

        let new_chore = NewChore::new("Wash car", Some(300), None);
        let result = create_chore(&pool, new_chore, vec![alice, bob], None)
            .await
            .unwrap();

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
        let result = create_chore(&pool, new_chore, vec![alice], Some(due))
            .await
            .unwrap();
        assert_eq!(result.assignments[0].due_at, Some(due));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn create_chore_rejects_blank_description(pool: PgPool) {
        let err = create_chore(&pool, input("  "), vec![], None)
            .await
            .unwrap_err();
        assert!(matches!(err, ServiceError::Validation(_)));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn create_chore_rejects_unknown_assignee(pool: PgPool) {
        let new_chore = NewChore::new("Walk dog", None, None);
        let err = create_chore(&pool, new_chore, vec![Uuid::new_v4()], None)
            .await
            .unwrap_err();
        assert!(matches!(err, ServiceError::UnknownAssignees));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn update_chore_updates_all_fields(pool: PgPool) {
        let chore_id = seed_chore(&pool, "Sweep porch", 100).await;

        let result = update_chore(
            &pool,
            ChoreId(chore_id),
            ChoreUpdate::new("Sweep back porch", 250, Some(Recurrence::Weekly), false),
            vec![],
        )
        .await
        .unwrap();

        assert_eq!(result.chore.description, "Sweep back porch");
        assert_eq!(result.chore.value_cents, 250);
        assert_eq!(result.chore.recurrence, Some(Recurrence::Weekly));
        assert!(!result.chore.is_active);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn update_chore_adds_pending_assignment_for_new_person(pool: PgPool) {
        let chore_id = seed_chore(&pool, "Sweep porch", 100).await;
        let alice = seed_person(&pool, "Alice").await;

        let result = update_chore(
            &pool,
            ChoreId(chore_id),
            update("Sweep porch", 100, true),
            vec![alice],
        )
        .await
        .unwrap();

        assert_eq!(result.assignees.len(), 1);
        assert_eq!(result.assignees[0].id.0, alice);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn update_chore_removes_person_with_only_pending_assignment(pool: PgPool) {
        let chore_id = seed_chore(&pool, "Sweep porch", 100).await;
        let alice = seed_person(&pool, "Alice").await;
        insert_assignment(&pool, chore_id, alice, "Pending").await;

        let result = update_chore(
            &pool,
            ChoreId(chore_id),
            update("Sweep porch", 100, true),
            vec![],
        )
        .await
        .unwrap();

        assert!(result.assignees.is_empty());
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn update_chore_keeps_person_with_completed_assignment_in_list(pool: PgPool) {
        let chore_id = seed_chore(&pool, "Sweep porch", 100).await;
        let alice = seed_person(&pool, "Alice").await;
        insert_assignment(&pool, chore_id, alice, "Completed").await;

        let result = update_chore(
            &pool,
            ChoreId(chore_id),
            update("Sweep porch", 100, true),
            vec![],
        )
        .await
        .unwrap();

        assert_eq!(result.assignees.len(), 1);
        assert_eq!(result.assignees[0].id.0, alice);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn update_chore_leaves_untouched_assignee_alone(pool: PgPool) {
        let chore_id = seed_chore(&pool, "Sweep porch", 100).await;
        let alice = seed_person(&pool, "Alice").await;
        insert_assignment(&pool, chore_id, alice, "Pending").await;

        let result = update_chore(
            &pool,
            ChoreId(chore_id),
            update("Sweep porch", 100, true),
            vec![alice],
        )
        .await
        .unwrap();

        assert_eq!(result.assignees.len(), 1);
        assert_eq!(result.assignees[0].id.0, alice);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn update_chore_rejects_blank_description(pool: PgPool) {
        let chore_id = seed_chore(&pool, "Sweep porch", 100).await;

        let err = update_chore(&pool, ChoreId(chore_id), update("  ", 100, true), vec![])
            .await
            .unwrap_err();

        assert!(matches!(err, ServiceError::Validation(_)));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn update_chore_rejects_negative_value(pool: PgPool) {
        let chore_id = seed_chore(&pool, "Sweep porch", 100).await;

        let err = update_chore(
            &pool,
            ChoreId(chore_id),
            update("Sweep porch", -1, true),
            vec![],
        )
        .await
        .unwrap_err();

        assert!(matches!(err, ServiceError::Validation(_)));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn update_chore_rejects_unknown_assignee(pool: PgPool) {
        let chore_id = seed_chore(&pool, "Sweep porch", 100).await;

        let err = update_chore(
            &pool,
            ChoreId(chore_id),
            update("Sweep porch", 100, true),
            vec![Uuid::new_v4()],
        )
        .await
        .unwrap_err();

        assert!(matches!(err, ServiceError::UnknownAssignees));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn update_chore_returns_not_found_for_nonexistent_id(pool: PgPool) {
        let err = update_chore(
            &pool,
            ChoreId(Uuid::new_v4()),
            update("Ghost chore", 0, true),
            vec![],
        )
        .await
        .unwrap_err();

        assert!(matches!(err, ServiceError::NotFound));
    }
}
