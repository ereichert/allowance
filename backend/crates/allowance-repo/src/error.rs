//! Repository error type.

use thiserror::Error;

#[derive(Debug, Error)]
pub enum RepoError {
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),
}
