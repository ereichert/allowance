//! Domain model and validation for chores.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ChoreId(pub Uuid);

/// How often a chore recurs.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Recurrence {
    Daily,
    Weekly,
    Biweekly,
    Monthly,
    Custom(String),
}

#[derive(Debug, Clone)]
pub struct Chore {
    pub id: ChoreId,
    pub description: String,
    pub value_cents: i64,
    pub recurrence: Option<Recurrence>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Normalized input for creating a new chore.
///
/// Constructed via `NewChore::new()`, which trims the description and
/// defaults `value_cents` to 0. Fields are private to ensure all instances
/// are normalized.
#[derive(Debug, Clone)]
pub struct NewChore {
    description: String,
    value_cents: i64,
    recurrence: Option<Recurrence>,
}

#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum ChoreValidationError {
    #[error("description must not be blank")]
    BlankDescription,
    #[error("value_cents must be non-negative, got {0}")]
    NegativeValue(i64),
}

impl NewChore {
    /// Construct a normalized `NewChore`: description is trimmed, value_cents defaults to 0.
    pub fn new(
        description: impl Into<String>,
        value_cents: Option<i64>,
        recurrence: Option<Recurrence>,
    ) -> Self {
        NewChore {
            description: description.into().trim().to_string(),
            value_cents: value_cents.unwrap_or(0),
            recurrence,
        }
    }

    pub fn description(&self) -> &str {
        &self.description
    }

    pub fn value_cents(&self) -> i64 {
        self.value_cents
    }

    pub fn recurrence(&self) -> Option<&Recurrence> {
        self.recurrence.as_ref()
    }

    /// Validate the chore input, returning an error if the description is blank or value is negative.
    pub fn validate(&self) -> Result<(), ChoreValidationError> {
        if self.description.is_empty() {
            return Err(ChoreValidationError::BlankDescription);
        }
        if self.value_cents < 0 {
            return Err(ChoreValidationError::NegativeValue(self.value_cents));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn construction_trims_description() {
        let chore = NewChore::new("  Dishes  ", None, None);
        assert_eq!(chore.description(), "Dishes");
    }

    #[test]
    fn construction_defaults_value_cents_to_zero() {
        let chore = NewChore::new("Sweep", None, None);
        assert_eq!(chore.value_cents(), 0);
    }

    #[test]
    fn construction_preserves_explicit_value_cents() {
        let chore = NewChore::new("Sweep", Some(150), None);
        assert_eq!(chore.value_cents(), 150);
    }

    #[test]
    fn valid_chore_passes_validation() {
        assert!(NewChore::new("Take out trash", Some(100), None)
            .validate()
            .is_ok());
    }

    #[test]
    fn blank_description_is_rejected() {
        assert_eq!(
            NewChore::new("   ", Some(50), None).validate(),
            Err(ChoreValidationError::BlankDescription)
        );
    }

    #[test]
    fn empty_description_is_rejected() {
        assert_eq!(
            NewChore::new("", None, None).validate(),
            Err(ChoreValidationError::BlankDescription)
        );
    }

    #[test]
    fn negative_value_cents_is_rejected() {
        assert_eq!(
            NewChore::new("Mow lawn", Some(-1), None).validate(),
            Err(ChoreValidationError::NegativeValue(-1))
        );
    }

    #[test]
    fn zero_value_cents_is_valid() {
        assert!(NewChore::new("Water plants", Some(0), None)
            .validate()
            .is_ok());
    }
}
