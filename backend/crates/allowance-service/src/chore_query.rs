//! Read-path service operations for listing chores.

use allowance_domain::{Chore, ChoreAssignee, ChoreId};
use sqlx::PgPool;

use crate::error::ServiceError;
use crate::pagination;

#[derive(Debug, Clone)]
pub struct ListChoresQuery {
    pub page: i64,
    pub per_page: i64,
    pub description: Option<String>,
}

#[derive(Debug)]
pub struct ChoreWithAssignees {
    pub chore: Chore,
    pub assignees: Vec<ChoreAssignee>,
}

#[derive(Debug)]
pub struct ChoresPage {
    pub chores: Vec<ChoreWithAssignees>,
    pub total: i64,
}

pub async fn list_chores(
    pool: &PgPool,
    query: ListChoresQuery,
) -> Result<ChoresPage, ServiceError> {
    let pagination = pagination::clamp(query.page, query.per_page);

    let filter = allowance_repo::chore_query::ChoreFilter {
        limit: pagination.per_page,
        offset: pagination.offset,
        description: query.description.clone(),
    };

    let chores = allowance_repo::chore_query::list_chores(pool, &filter).await?;
    let total =
        allowance_repo::chore_query::count_chores(pool, query.description.as_deref()).await?;

    let chore_ids: Vec<ChoreId> = chores.iter().map(|c| c.id).collect();
    let mut assignees_by_chore =
        allowance_repo::chore_query::list_assignees_for_chores(pool, &chore_ids).await?;

    let chores = chores
        .into_iter()
        .map(|chore| {
            let assignees = assignees_by_chore.remove(&chore.id).unwrap_or_default();
            ChoreWithAssignees { chore, assignees }
        })
        .collect();

    Ok(ChoresPage { chores, total })
}

#[cfg(test)]
mod tests {
    use super::*;
    use allowance_test_helpers::{
        seed_assignment, seed_chore, seed_inactive_chore, seed_many_chores, seed_person,
    };
    use sqlx::PgPool;

    fn default_query() -> ListChoresQuery {
        ListChoresQuery {
            page: 1,
            per_page: 50,
            description: None,
        }
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_chores_returns_all_seeded_chores(pool: PgPool) {
        seed_chore(&pool, "Sweep porch", 100).await;
        seed_chore(&pool, "Wash dishes", 150).await;

        let page = list_chores(&pool, default_query()).await.unwrap();
        assert_eq!(page.chores.len(), 2);
        assert_eq!(page.total, 2);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_chores_includes_inactive_chores(pool: PgPool) {
        seed_chore(&pool, "Sweep porch", 100).await;
        seed_inactive_chore(&pool, "Retired chore", 150).await;

        let page = list_chores(&pool, default_query()).await.unwrap();
        assert_eq!(page.total, 2);

        let retired = page
            .chores
            .iter()
            .find(|c| c.chore.description == "Retired chore")
            .expect("inactive chore should still be returned");
        assert!(!retired.chore.is_active);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_chores_filters_by_description(pool: PgPool) {
        seed_chore(&pool, "Take out trash", 100).await;
        seed_chore(&pool, "Wash dishes", 150).await;

        let query = ListChoresQuery {
            page: 1,
            per_page: 50,
            description: Some("trash".to_string()),
        };
        let page = list_chores(&pool, query).await.unwrap();
        assert_eq!(page.chores.len(), 1);
        assert_eq!(page.total, 1);
        assert_eq!(page.chores[0].chore.description, "Take out trash");
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_chores_clamps_per_page_to_max(pool: PgPool) {
        seed_many_chores(&pool, pagination::MAX_PER_PAGE + 1, 100).await;

        let query = ListChoresQuery {
            page: 1,
            per_page: 9999,
            description: None,
        };
        let page = list_chores(&pool, query).await.unwrap();
        assert_eq!(page.chores.len() as i64, pagination::MAX_PER_PAGE);
        assert_eq!(page.total, pagination::MAX_PER_PAGE + 1);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_chores_clamps_page_below_minimum_to_one(pool: PgPool) {
        seed_chore(&pool, "First", 100).await;
        seed_chore(&pool, "Second", 150).await;

        let query = ListChoresQuery {
            page: 0,
            per_page: 50,
            description: None,
        };
        let page = list_chores(&pool, query).await.unwrap();
        assert_eq!(page.chores.len(), 2);
        assert_eq!(page.total, 2);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_chores_attaches_assignees_sorted_by_name(pool: PgPool) {
        let chore = seed_chore(&pool, "Sweep porch", 100).await;
        let bob = seed_person(&pool, "Bob").await;
        let alice = seed_person(&pool, "Alice").await;
        seed_assignment(&pool, chore, bob).await;
        seed_assignment(&pool, chore, alice).await;

        let page = list_chores(&pool, default_query()).await.unwrap();

        let names: Vec<&str> = page.chores[0]
            .assignees
            .iter()
            .map(|a| a.name.as_str())
            .collect();
        assert_eq!(names, vec!["Alice", "Bob"]);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_chores_returns_empty_assignees_for_unassigned_chore(pool: PgPool) {
        seed_chore(&pool, "Sweep porch", 100).await;

        let page = list_chores(&pool, default_query()).await.unwrap();

        assert!(page.chores[0].assignees.is_empty());
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_chores_attaches_assignees_to_the_matching_chore(pool: PgPool) {
        let sweep = seed_chore(&pool, "Sweep porch", 100).await;
        seed_chore(&pool, "Wash dishes", 150).await;
        let alice = seed_person(&pool, "Alice").await;
        seed_assignment(&pool, sweep, alice).await;

        let page = list_chores(&pool, default_query()).await.unwrap();

        let sweep_item = page
            .chores
            .iter()
            .find(|c| c.chore.description == "Sweep porch")
            .unwrap();
        let wash_item = page
            .chores
            .iter()
            .find(|c| c.chore.description == "Wash dishes")
            .unwrap();
        assert_eq!(sweep_item.assignees[0].name, "Alice");
        assert!(wash_item.assignees.is_empty());
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_chores_paginates_correctly(pool: PgPool) {
        seed_chore(&pool, "First", 100).await;
        seed_chore(&pool, "Second", 150).await;
        seed_chore(&pool, "Third", 200).await;

        let q1 = ListChoresQuery {
            page: 1,
            per_page: 2,
            description: None,
        };
        let p1 = list_chores(&pool, q1).await.unwrap();
        assert_eq!(p1.chores.len(), 2);
        assert_eq!(p1.total, 3);

        let q2 = ListChoresQuery {
            page: 2,
            per_page: 2,
            description: None,
        };
        let p2 = list_chores(&pool, q2).await.unwrap();
        assert_eq!(p2.chores.len(), 1);
        assert_eq!(p2.total, 3);
    }
}
