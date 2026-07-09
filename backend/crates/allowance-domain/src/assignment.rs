//! Domain model for chore assignments.

use crate::chore::ChoreId;
use crate::person::PersonId;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct AssignmentId(pub Uuid);

/// Current status of a chore assignment.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AssignmentStatus {
    Pending,
    Completed,
    Verified,
    Skipped,
}

#[derive(Debug, Clone)]
pub struct ChoreAssignment {
    pub id: AssignmentId,
    pub chore_id: ChoreId,
    pub person_id: PersonId,
    pub assigned_by: Option<PersonId>,
    pub status: AssignmentStatus,
    pub due_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// A person currently assigned to a chore, as shown in chore listings.
/// Derived from assignment records: one entry per distinct person,
/// regardless of assignment status.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChoreAssignee {
    pub id: PersonId,
    pub name: String,
}

/// Input for creating a new chore assignment.
#[derive(Debug, Clone)]
pub struct NewChoreAssignment {
    pub chore_id: ChoreId,
    pub person_id: PersonId,
    pub assigned_by: Option<PersonId>,
    pub due_at: Option<DateTime<Utc>>,
}
