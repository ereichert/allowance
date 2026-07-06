//! Data access layer for Allowance.
//!
//! This crate provides database operations using SQLx with PostgreSQL.
//! It depends on `allowance-types` and `allowance-domain`.

pub mod chore;
pub mod chore_query;
pub mod error;
pub mod person;

pub use error::RepoError;
