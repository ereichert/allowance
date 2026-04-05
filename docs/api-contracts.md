# API Contracts

## Base URL

```text
/api/v1
```

## Conventions

- JSON request and response bodies
- Monetary values are always in **cents** (integer) to avoid floating-point issues
- Dates use ISO 8601 format (`2026-03-22`)
- Timestamps use ISO 8601 with timezone (`2026-03-22T14:30:00Z`)
- UUIDs for all entity identifiers
- All endpoints returning a list **must** support pagination via `?page=1&per_page=20` (default 20, max 100). No exceptions for "small" collections.
- All list endpoints **must** support at least one filter or search parameter. Supported parameters must be documented in the endpoint definition.
- List response envelope: `{ "items": [...], "total": N, "page": N, "per_page": N }` — see the GET /people example below.
- Errors return `{ "error": "message" }` with appropriate HTTP status

## Endpoints

### Chores

| Method | Path               | Description                |
|--------|--------------------|----------------------------|
| GET    | /chores            | List all chores            |
| POST   | /chores            | Create a chore             |
| GET    | /chores/:id        | Get chore by ID            |
| PUT    | /chores/:id        | Update a chore             |
| DELETE | /chores/:id        | Deactivate a chore         |

### People

| Method | Path               | Description                |
|--------|--------------------|----------------------------|
| GET    | /people            | List all people            |
| POST   | /people            | Create a person            |
| GET    | /people/:id        | Get person by ID           |
| PUT    | /people/:id        | Update a person            |

### Assignments

| Method | Path                          | Description                       |
|--------|-------------------------------|-----------------------------------|
| GET    | /assignments                  | List assignments (filterable)     |
| POST   | /assignments                  | Create an assignment              |
| GET    | /assignments/:id              | Get assignment by ID              |
| PATCH  | /assignments/:id/status       | Update assignment status          |
| GET    | /people/:id/assignments       | List assignments for a person     |

### Payouts

| Method | Path                          | Description                       |
|--------|-------------------------------|-----------------------------------|
| GET    | /payouts                      | List payouts (filterable)         |
| POST   | /payouts                      | Create a payout                   |
| GET    | /payouts/:id                  | Get payout with line items        |
| GET    | /people/:id/payouts           | List payouts for a person         |

### Statistics

| Method | Path                          | Description                       |
|--------|-------------------------------|-----------------------------------|
| GET    | /stats/person/:id             | Stats for a specific person       |
| GET    | /stats/overview               | Household-level overview          |

## Request/Response Examples

### POST /api/v1/chores

Creates a chore. If `assignee_ids` is provided, a `ChoreAssignment` is created
for each person with status `Pending`.

#### Request body

```json
{
  "description": "Take out trash",
  "value_cents": 100,
  "due_at": "2026-04-05T18:00:00Z",
  "assignee_ids": ["uuid-1", "uuid-2"]
}
```

- `description` — required
- `value_cents` — optional, integer cents, defaults to 0
- `due_at` — optional, ISO 8601 timestamp
- `assignee_ids` — optional, array of Person UUIDs

#### Response `201 Created`

```json
{
  "id": "uuid",
  "description": "Take out trash",
  "value_cents": 100,
  "recurrence": null,
  "is_active": true,
  "created_at": "2026-04-02T12:00:00Z",
  "updated_at": "2026-04-02T12:00:00Z"
}
```

#### Errors

| Status | Condition                          |
|--------|------------------------------------|
| 400    | `description` missing or blank     |
| 422    | An `assignee_id` does not exist    |
| 500    | Unexpected server error            |

---

### GET /api/v1/people

Returns a paginated list of people (used to populate the assignee multi-select).
Supports optional partial name search.

#### Query parameters

| Parameter  | Type    | Default | Max | Description                           |
|------------|---------|---------|-----|---------------------------------------|
| `page`     | integer | 1       | —   | Page number (1-indexed)               |
| `per_page` | integer | 20      | 100 | Results per page                      |
| `name`     | string  | —       | —   | Case-insensitive partial name filter  |

#### Response `200 OK`

```json
{
  "items": [
    { "id": "uuid", "name": "Alice", "role": "Child", "created_at": "2026-01-01T00:00:00Z" },
    { "id": "uuid", "name": "Bob",   "role": "Admin", "created_at": "2026-01-01T00:00:00Z" }
  ],
  "total": 2,
  "page": 1,
  "per_page": 20
}
```
