//! Business rules, domain logic, and core types for Allowance.
//!
//! This crate contains the foundational types, validation, business rules,
//! and domain models. It has no internal crate dependencies and must remain
//! database-agnostic.

pub mod assignment;
pub mod chore;
pub mod payout;
pub mod person;

pub use assignment::{
    AssignmentId, AssignmentStatus, ChoreAssignee, ChoreAssignment, NewChoreAssignment,
};
pub use chore::{Chore, ChoreId, ChoreUpdate, ChoreValidationError, NewChore, Recurrence};
pub use payout::{PayoutId, PayoutType};
pub use person::{Person, PersonId, Role};
