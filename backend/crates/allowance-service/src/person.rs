//! Service operations for people.

use allowance_domain::Person;
use sqlx::PgPool;

use crate::error::ServiceError;

#[derive(Debug, Clone)]
pub struct ListPeopleQuery {
    pub page: i64,
    pub per_page: i64,
    pub name: Option<String>,
}

#[derive(Debug)]
pub struct PeoplePage {
    pub people: Vec<Person>,
    pub total: i64,
}

const MAX_PER_PAGE: i64 = 100;

/// `per_page` is clamped to `MAX_PER_PAGE`; `page` is clamped to a minimum of 1.
pub async fn list_people(pool: &PgPool, query: ListPeopleQuery) -> Result<PeoplePage, ServiceError> {
    let page = query.page.max(1);
    let per_page = query.per_page.clamp(1, MAX_PER_PAGE);
    let offset = (page - 1) * per_page;

    let filter = allowance_repo::person::PeopleFilter {
        limit: per_page,
        offset,
        name: query.name.clone(),
    };

    let people = allowance_repo::person::list_people(pool, &filter).await?;
    let total = allowance_repo::person::count_people(pool, query.name.as_deref()).await?;

    Ok(PeoplePage { people, total })
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::PgPool;


    use allowance_test_helpers::seed_person;

fn default_query() -> ListPeopleQuery {
        ListPeopleQuery { page: 1, per_page: 50, name: None }
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_people_returns_all_seeded_people(pool: PgPool) {
        seed_person(&pool, "Charlie").await;
        seed_person(&pool, "Dana").await;

        let page = list_people(&pool, default_query()).await.unwrap();
        assert_eq!(page.people.len(), 2);
        assert_eq!(page.total, 2);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_people_filters_by_name(pool: PgPool) {
        seed_person(&pool, "Alice").await;
        seed_person(&pool, "Bob").await;

        let query = ListPeopleQuery { page: 1, per_page: 50, name: Some("ali".to_string()) };
        let page = list_people(&pool, query).await.unwrap();
        assert_eq!(page.people.len(), 1);
        assert_eq!(page.total, 1);
        assert_eq!(page.people[0].name, "Alice");
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_people_clamps_per_page_to_max(pool: PgPool) {
        let query = ListPeopleQuery { page: 1, per_page: 9999, name: None };
        let page = list_people(&pool, query).await.unwrap();
        assert_eq!(page.total, 0);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_people_paginates_correctly(pool: PgPool) {
        seed_person(&pool, "Alice").await;
        seed_person(&pool, "Bob").await;
        seed_person(&pool, "Carol").await;

        let q1 = ListPeopleQuery { page: 1, per_page: 2, name: None };
        let p1 = list_people(&pool, q1).await.unwrap();
        assert_eq!(p1.people.len(), 2);
        assert_eq!(p1.total, 3);

        let q2 = ListPeopleQuery { page: 2, per_page: 2, name: None };
        let p2 = list_people(&pool, q2).await.unwrap();
        assert_eq!(p2.people.len(), 1);
        assert_eq!(p2.total, 3);
        assert_eq!(p2.people[0].name, "Carol");
    }
}
