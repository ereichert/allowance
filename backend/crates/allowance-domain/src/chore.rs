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

impl Recurrence {
    const CRON_DAILY: &'static str = "@daily";
    const CRON_WEEKLY: &'static str = "@weekly";
    const CRON_BIWEEKLY: &'static str = "0 0 1,15 * *";
    const CRON_MONTHLY: &'static str = "@monthly";

    pub fn to_cron(&self) -> String {
        match self {
            Recurrence::Daily => Self::CRON_DAILY.to_string(),
            Recurrence::Weekly => Self::CRON_WEEKLY.to_string(),
            Recurrence::Biweekly => Self::CRON_BIWEEKLY.to_string(),
            Recurrence::Monthly => Self::CRON_MONTHLY.to_string(),
            Recurrence::Custom(expr) => expr.clone(),
        }
    }

    pub fn from_cron(cron: &str) -> Self {
        match cron {
            Self::CRON_DAILY => Recurrence::Daily,
            Self::CRON_WEEKLY => Recurrence::Weekly,
            Self::CRON_BIWEEKLY => Recurrence::Biweekly,
            Self::CRON_MONTHLY => Recurrence::Monthly,
            other => Recurrence::Custom(other.to_string()),
        }
    }
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

fn validate_description_and_value(
    description: &str,
    value_cents: i64,
) -> Result<(), ChoreValidationError> {
    if description.is_empty() {
        return Err(ChoreValidationError::BlankDescription);
    }
    if value_cents < 0 {
        return Err(ChoreValidationError::NegativeValue(value_cents));
    }
    Ok(())
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

    pub fn validate(&self) -> Result<(), ChoreValidationError> {
        validate_description_and_value(&self.description, self.value_cents)
    }
}

/// Normalized input for updating an existing chore.
///
/// Constructed via `ChoreUpdate::new()`, which trims the description. Fields
/// are private to ensure all instances are normalized. Unlike `NewChore`,
/// carries `is_active` since an update can flip it; creation always starts
/// a chore active.
#[derive(Debug, Clone)]
pub struct ChoreUpdate {
    description: String,
    value_cents: i64,
    recurrence: Option<Recurrence>,
    is_active: bool,
}

impl ChoreUpdate {
    pub fn new(
        description: impl Into<String>,
        value_cents: i64,
        recurrence: Option<Recurrence>,
        is_active: bool,
    ) -> Self {
        ChoreUpdate {
            description: description.into().trim().to_string(),
            value_cents,
            recurrence,
            is_active,
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

    pub fn is_active(&self) -> bool {
        self.is_active
    }

    pub fn validate(&self) -> Result<(), ChoreValidationError> {
        validate_description_and_value(&self.description, self.value_cents)
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

    #[test]
    fn daily_round_trips_through_cron() {
        assert_eq!(
            Recurrence::from_cron(&Recurrence::Daily.to_cron()),
            Recurrence::Daily
        );
    }

    #[test]
    fn weekly_round_trips_through_cron() {
        assert_eq!(
            Recurrence::from_cron(&Recurrence::Weekly.to_cron()),
            Recurrence::Weekly
        );
    }

    #[test]
    fn biweekly_round_trips_through_cron() {
        assert_eq!(
            Recurrence::from_cron(&Recurrence::Biweekly.to_cron()),
            Recurrence::Biweekly
        );
    }

    #[test]
    fn monthly_round_trips_through_cron() {
        assert_eq!(
            Recurrence::from_cron(&Recurrence::Monthly.to_cron()),
            Recurrence::Monthly
        );
    }

    #[test]
    fn custom_round_trips_through_cron() {
        let expr = "0 9 * * 1-5";
        assert_eq!(
            Recurrence::from_cron(&Recurrence::Custom(expr.to_string()).to_cron()),
            Recurrence::Custom(expr.to_string()),
        );
    }

    #[test]
    fn unknown_cron_string_becomes_custom() {
        assert_eq!(
            Recurrence::from_cron("5 4 * * sun"),
            Recurrence::Custom("5 4 * * sun".to_string()),
        );
    }

    #[test]
    fn chore_update_construction_trims_description() {
        let update = ChoreUpdate::new("  Dishes  ", 0, None, true);
        assert_eq!(update.description(), "Dishes");
    }

    #[test]
    fn chore_update_preserves_value_cents_recurrence_and_is_active() {
        let update = ChoreUpdate::new("Sweep", 150, Some(Recurrence::Weekly), false);
        assert_eq!(update.value_cents(), 150);
        assert_eq!(update.recurrence(), Some(&Recurrence::Weekly));
        assert!(!update.is_active());
    }

    #[test]
    fn valid_chore_update_passes_validation() {
        assert!(ChoreUpdate::new("Take out trash", 100, None, true)
            .validate()
            .is_ok());
    }

    #[test]
    fn chore_update_blank_description_is_rejected() {
        assert_eq!(
            ChoreUpdate::new("   ", 50, None, true).validate(),
            Err(ChoreValidationError::BlankDescription)
        );
    }

    #[test]
    fn chore_update_negative_value_cents_is_rejected() {
        assert_eq!(
            ChoreUpdate::new("Mow lawn", -1, None, true).validate(),
            Err(ChoreValidationError::NegativeValue(-1))
        );
    }

    #[test]
    fn chore_update_zero_value_cents_is_valid() {
        assert!(ChoreUpdate::new("Water plants", 0, None, true)
            .validate()
            .is_ok());
    }
}
