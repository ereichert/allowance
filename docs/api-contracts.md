# API Contracts

## Base URL

```
/api/v1
```

## Conventions

- JSON request and response bodies
- Monetary values are always in **cents** (integer) to avoid floating-point issues
- Dates use ISO 8601 format (`2026-03-22`)
- Timestamps use ISO 8601 with timezone (`2026-03-22T14:30:00Z`)
- UUIDs for all entity identifiers
- Pagination via `?page=1&per_page=20` (default 20, max 100)
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

Detailed request/response shapes will be added as endpoints are implemented.
Each endpoint implementation must update this document before merging.
