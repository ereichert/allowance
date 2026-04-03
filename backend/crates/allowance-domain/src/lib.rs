//! Business rules and domain logic for Allowance.
//!
//! This crate contains validation, business rules, and domain operations.
//! It depends only on `allowance-types` and must remain database-agnostic.

pub mod assignment;
pub mod chore;
pub mod person;

pub use assignment::{ChoreAssignment, NewChoreAssignment};
pub use chore::{Chore, ChoreValidationError, NewChore};
pub use person::Person;
