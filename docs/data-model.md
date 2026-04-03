# Data Model

## Core Entities

### Chore

A unit of work that can be assigned, completed, and paid out.

| Field           | Type     | Description                                              |
|-----------------|----------|----------------------------------------------------------|
| id              | UUID     | Primary key                                              |
| description     | String   | Display name / description (e.g., "Take out trash")      |
| value_cents     | i64      | Monetary value in cents (avoids float math)              |
| recurrence_cron | String?  | Cron expression for recurrence; NULL = single-occurrence |
| is_active       | bool     | Whether the chore is available for assignment            |
| created_at      | DateTime | When the chore was created                               |
| updated_at      | DateTime | Last modification timestamp                              |

### Person

A participant in the system (child or admin/parent).

| Field      | Type     | Description                 |
|------------|----------|-----------------------------|
| id         | UUID     | Primary key                 |
| name       | String   | Display name                |
| role       | Role     | `Admin` or `Child`          |
| created_at | DateTime | When the person was created |

### ChoreAssignment

Links a chore to a person for a specific instance/period.

| Field        | Type             | Description                                    |
|--------------|------------------|------------------------------------------------|
| id           | UUID             | Primary key                                    |
| chore_id     | UUID             | FK → Chore                                     |
| person_id    | UUID             | FK → Person                                    |
| assigned_by  | UUID?            | FK → Person (null if self-assigned)            |
| status       | AssignmentStatus | `Pending`, `Completed`, `Verified`, `Skipped`  |
| due_at       | DateTime?        | Optional due date and time                     |
| completed_at | DateTime?        | When marked complete                           |
| created_at   | DateTime         | When assigned                                  |

### Payout

Records a payment for completed chores.

| Field        | Type       | Description                                 |
|--------------|------------|---------------------------------------------|
| id           | UUID       | Primary key                                 |
| person_id    | UUID       | FK → Person                                 |
| amount_cents | i64        | Total payout amount in cents                |
| payout_type  | PayoutType | `Scheduled` or `AdHoc`                      |
| period_start | Date?      | Start of pay period (for scheduled payouts) |
| period_end   | Date?      | End of pay period (for scheduled payouts)   |
| created_at   | DateTime   | When the payout was issued                  |

### PayoutLineItem

Links a payout to the specific assignments it covers.

| Field         | Type | Description               |
|---------------|------|---------------------------|
| id            | UUID | Primary key               |
| payout_id     | UUID | FK → Payout               |
| assignment_id | UUID | FK → ChoreAssignment      |
| amount_cents  | i64  | Amount for this line item |

## Enumerations

### Role

`Admin` | `Child`

### Recurrence

Application-layer enum: `Daily` | `Weekly` | `Biweekly` | `Monthly` | `Custom(cron_expr)`

Not stored as a database enum. Each variant maps to a canonical cron expression stored
in `chores.recurrence_cron`. Named variants use sentinels (`@daily`, `@weekly`, etc.);
`Custom` stores its expression directly. `NULL` means no recurrence (single-occurrence).

### AssignmentStatus

`Pending` | `Completed` | `Verified` | `Skipped`

### PayoutType

`Scheduled` | `AdHoc`

## Relationships

```text
Person 1──*  ChoreAssignment  *──1 Chore
Person 1──*  Payout
Payout  1──*  PayoutLineItem  *──1 ChoreAssignment
```

## Statistics

Chore statistics are derived — not stored — computed from ChoreAssignment
and Payout records. This includes:

- Completion rate per person over time
- Earnings per person per period
- Most/least completed chores
- Streak tracking (consecutive completions)

Expensive stats queries should be cached at the service layer as needed.
