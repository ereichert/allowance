//! Orchestration layer for Allowance.
//!
//! This crate ties together domain logic, data access, and configuration.
//! It provides the high-level operations that the API layer calls into.

pub mod chore;
pub mod chore_query;
pub mod error;
mod pagination;
pub mod person;

pub use error::ServiceError;
