//! Business rules, domain logic, and core types for Allowance.
//!
//! This crate contains the foundational types, validation, business rules,
//! and domain models. It has no internal crate dependencies and must remain
//! database-agnostic.

pub mod assignment;
pub mod chore;
pub mod person;
pub mod payout;

pub use assignment::{AssignmentId, AssignmentStatus, ChoreAssignment, NewChoreAssignment};
pub use chore::{Chore, ChoreId, ChoreValidationError, NewChore, Recurrence};
pub use person::{Person, PersonId, Role};
pub use payout::{PayoutId, PayoutType};
