//! Repository operations for people.

use allowance_domain::{Person, PersonId, Role};
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::RepoError;

struct PersonRow {
    id: Uuid,
    name: String,
    role: String,
    created_at: DateTime<Utc>,
}

impl TryFrom<PersonRow> for Person {
    type Error = RepoError;

    fn try_from(row: PersonRow) -> Result<Self, Self::Error> {
        let role = match row.role.as_str() {
            "Admin" => Role::Admin,
            "Child" => Role::Child,
            other => {
                return Err(RepoError::Database(sqlx::Error::Decode(
                    format!("unknown role value: {other}").into(),
                )))
            }
        };
        Ok(Person {
            id: PersonId(row.id),
            name: row.name,
            role,
            created_at: row.created_at,
        })
    }
}

/// Input for filtering and paginating the people list.
#[derive(Debug, Clone)]
pub struct PeopleFilter {
    pub limit: i64,
    pub offset: i64,
    pub name: Option<String>,
}

/// Fetch a filtered, paginated slice of people ordered by name.
pub async fn list_people(pool: &PgPool, filter: &PeopleFilter) -> Result<Vec<Person>, RepoError> {
    let rows = sqlx::query_as!(
        PersonRow,
        r#"
        SELECT id, name, role::text AS "role!", created_at
        FROM people
        WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%')
        ORDER BY name
        LIMIT $2 OFFSET $3
        "#,
        filter.name.as_deref(),
        filter.limit,
        filter.offset,
    )
    .fetch_all(pool)
    .await?;

    rows.into_iter().map(Person::try_from).collect()
}

/// Count people matching the optional name filter (used for pagination totals).
pub async fn count_people(pool: &PgPool, name: Option<&str>) -> Result<i64, RepoError> {
    let count = sqlx::query_scalar!(
        r#"SELECT COUNT(*) AS "count!" FROM people
           WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%')"#,
        name,
    )
    .fetch_one(pool)
    .await?;

    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::PgPool;

    #[test]
    fn try_from_person_row_returns_error_for_unknown_role() {
        let row = PersonRow {
            id: Uuid::new_v4(),
            name: "Alice".to_string(),
            role: "SuperAdmin".to_string(),
            created_at: chrono::Utc::now(),
        };
        assert!(matches!(Person::try_from(row), Err(RepoError::Database(_))));
    }

    use allowance_test_helpers::insert_person;

    fn all_filter() -> PeopleFilter {
        PeopleFilter {
            limit: 100,
            offset: 0,
            name: None,
        }
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_people_returns_all_rows(pool: PgPool) {
        insert_person(&pool, "Alice", "Child").await;
        insert_person(&pool, "Bob", "Admin").await;

        let people = list_people(&pool, &all_filter()).await.unwrap();
        assert_eq!(people.len(), 2);

        let names: Vec<&str> = people.iter().map(|p| p.name.as_str()).collect();
        assert!(names.contains(&"Alice"));
        assert!(names.contains(&"Bob"));
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_people_returns_empty_when_no_rows(pool: PgPool) {
        let people = list_people(&pool, &all_filter()).await.unwrap();
        assert!(people.is_empty());
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_people_maps_admin_role_correctly(pool: PgPool) {
        insert_person(&pool, "Charlie", "Admin").await;

        let people = list_people(&pool, &all_filter()).await.unwrap();
        assert_eq!(people[0].role, Role::Admin);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_people_maps_child_role_correctly(pool: PgPool) {
        insert_person(&pool, "Dana", "Child").await;

        let people = list_people(&pool, &all_filter()).await.unwrap();
        assert_eq!(people[0].role, Role::Child);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_people_results_are_ordered_by_name(pool: PgPool) {
        insert_person(&pool, "Carol", "Child").await;
        insert_person(&pool, "Alice", "Child").await;
        insert_person(&pool, "Bob", "Child").await;

        let people = list_people(&pool, &all_filter()).await.unwrap();
        assert_eq!(people[0].name, "Alice");
        assert_eq!(people[1].name, "Bob");
        assert_eq!(people[2].name, "Carol");
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_people_offset_beyond_row_count_returns_empty(pool: PgPool) {
        insert_person(&pool, "Alice", "Child").await;

        let filter = PeopleFilter {
            limit: 100,
            offset: 10,
            name: None,
        };
        let people = list_people(&pool, &filter).await.unwrap();
        assert!(people.is_empty());
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_people_filters_by_partial_name(pool: PgPool) {
        insert_person(&pool, "Alice", "Child").await;
        insert_person(&pool, "Bob", "Child").await;

        let filter = PeopleFilter {
            limit: 100,
            offset: 0,
            name: Some("ali".to_string()),
        };
        let people = list_people(&pool, &filter).await.unwrap();
        assert_eq!(people.len(), 1);
        assert_eq!(people[0].name, "Alice");
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_people_name_filter_is_case_insensitive(pool: PgPool) {
        insert_person(&pool, "Alice", "Child").await;

        let filter = PeopleFilter {
            limit: 100,
            offset: 0,
            name: Some("ALICE".to_string()),
        };
        let people = list_people(&pool, &filter).await.unwrap();
        assert_eq!(people.len(), 1);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_people_name_filter_with_no_match_returns_empty(pool: PgPool) {
        insert_person(&pool, "Alice", "Child").await;

        let filter = PeopleFilter {
            limit: 100,
            offset: 0,
            name: Some("zzz".to_string()),
        };
        let people = list_people(&pool, &filter).await.unwrap();
        assert!(people.is_empty());
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_people_respects_limit(pool: PgPool) {
        insert_person(&pool, "Alice", "Child").await;
        insert_person(&pool, "Bob", "Child").await;
        insert_person(&pool, "Carol", "Child").await;

        let filter = PeopleFilter {
            limit: 2,
            offset: 0,
            name: None,
        };
        let people = list_people(&pool, &filter).await.unwrap();
        assert_eq!(people.len(), 2);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn list_people_respects_offset(pool: PgPool) {
        insert_person(&pool, "Alice", "Child").await;
        insert_person(&pool, "Bob", "Child").await;
        insert_person(&pool, "Carol", "Child").await;

        let filter = PeopleFilter {
            limit: 100,
            offset: 1,
            name: None,
        };
        let people = list_people(&pool, &filter).await.unwrap();
        assert_eq!(people.len(), 2);
        assert_eq!(people[0].name, "Bob");
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn count_people_returns_total(pool: PgPool) {
        insert_person(&pool, "Alice", "Child").await;
        insert_person(&pool, "Bob", "Admin").await;

        let total = count_people(&pool, None).await.unwrap();
        assert_eq!(total, 2);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn count_people_filters_by_partial_name(pool: PgPool) {
        insert_person(&pool, "Alice", "Child").await;
        insert_person(&pool, "Alicia", "Child").await;
        insert_person(&pool, "Bob", "Child").await;

        let total = count_people(&pool, Some("ali")).await.unwrap();
        assert_eq!(total, 2);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn count_people_returns_zero_when_empty(pool: PgPool) {
        let total = count_people(&pool, None).await.unwrap();
        assert_eq!(total, 0);
    }

    #[sqlx::test(migrations = "../../migrations")]
    async fn count_people_name_filter_with_no_match_returns_zero(pool: PgPool) {
        insert_person(&pool, "Alice", "Child").await;

        let total = count_people(&pool, Some("zzz")).await.unwrap();
        assert_eq!(total, 0);
    }
}
