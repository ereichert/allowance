//! Domain model for chore assignments.

use allowance_types::{AssignmentId, AssignmentStatus, ChoreId, PersonId};
use chrono::{DateTime, Utc};

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

/// Input for creating a new chore assignment.
#[derive(Debug, Clone)]
pub struct NewChoreAssignment {
    pub chore_id: ChoreId,
    pub person_id: PersonId,
    pub assigned_by: Option<PersonId>,
    pub due_at: Option<DateTime<Utc>>,
}
