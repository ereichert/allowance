//! Service-level error type.

use allowance_domain::ChoreValidationError;
use allowance_repo::RepoError;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ServiceError {
    #[error("validation error: {0}")]
    Validation(#[from] ChoreValidationError),
    #[error("one or more assignee IDs do not exist")]
    UnknownAssignees,
    #[error("chore not found")]
    NotFound,
    #[error("database error: {0}")]
    Repo(#[from] RepoError),
}
