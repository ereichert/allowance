//! Route modules for the Allowance API.

pub mod chores;
pub mod people;

use allowance_service::ServiceError;
use axum::{http::StatusCode, response::{IntoResponse, Response}, Json};
use serde::Serialize;

#[derive(Debug, Serialize)]
struct ErrorBody {
    error: String,
}

/// Newtype wrapper so `ServiceError` can implement `IntoResponse`
/// without violating the orphan rule.
pub struct ApiError(pub ServiceError);

impl From<ServiceError> for ApiError {
    fn from(e: ServiceError) -> Self {
        ApiError(e)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match &self.0 {
            ServiceError::Validation(e) => (StatusCode::BAD_REQUEST, e.to_string()),
            ServiceError::UnknownAssignees => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "one or more assignee IDs do not exist".to_string(),
            ),
            ServiceError::Repo(e) => {
                tracing::error!(error = %e, "database error in handler");
                (StatusCode::INTERNAL_SERVER_ERROR, "internal server error".to_string())
            }
        };
        (status, Json(ErrorBody { error: message })).into_response()
    }
}
