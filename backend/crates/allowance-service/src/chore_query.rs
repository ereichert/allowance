//! Read-path service operations for listing chores.

use allowance_domain::Chore;
use sqlx::PgPool;

use crate::error::ServiceError;

#[derive(Debug, Clone)]
pub struct ListChoresQuery {
    pub page: i64,
    pub per_page: i64,
    pub description: Option<String>,
}

#[derive(Debug)]
pub struct ChoresPage {
    pub chores: Vec<Chore>,
    pub total: i64,
}

const MAX_PER_PAGE: i64 = 100;

/// `per_page` is clamped to `MAX_PER_PAGE`; `page` is clamped to a minimum of 1.
pub async fn list_chores(
    pool: &PgPool,
    query: ListChoresQuery,
) -> Result<ChoresPage, ServiceError> {
    let page = query.page.max(1);
    let per_page = query.per_page.clamp(1, MAX_PER_PAGE);
    let offset = (page - 1) * per_page;

    let filter = allowance_repo::chore_query::ChoreFilter {
        limit: per_page,
        offset,
        description: query.description.clone(),
    };

    let chores = allowance_repo::chore_query::list_chores(pool, &filter).await?;
    let total =
        allowance_repo::chore_query::count_chores(pool, query.description.as_deref()).await?;

    Ok(ChoresPage { chores, total })
}

#[cfg(test)]
mod tests {
    use super::*;
    use allowance_test_helpers::seed_chore;
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
        assert_eq!(page.chores[0].description, "Take out trash");
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_chores_clamps_per_page_to_max(pool: PgPool) {
        let query = ListChoresQuery {
            page: 1,
            per_page: 9999,
            description: None,
        };
        let page = list_chores(&pool, query).await.unwrap();
        assert_eq!(page.total, 0);
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
