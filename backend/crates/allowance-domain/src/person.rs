//! Domain model for people.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PersonId(pub Uuid);

/// Role a person holds in the system.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Role {
    Admin,
    Child,
}

#[derive(Debug, Clone)]
pub struct Person {
    pub id: PersonId,
    pub name: String,
    pub role: Role,
    pub created_at: DateTime<Utc>,
}
