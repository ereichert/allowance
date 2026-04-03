//! Domain model for people.

use allowance_types::{PersonId, Role};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone)]
pub struct Person {
    pub id: PersonId,
    pub name: String,
    pub role: Role,
    pub created_at: DateTime<Utc>,
}
