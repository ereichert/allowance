# Architecture

## Overview

Allowance is a client-server application with a Rust backend serving a REST API
and a React single-page application frontend.

```
┌─────────────┐        HTTP/JSON        ┌─────────────────┐
│   React SPA │ ◄─────────────────────► │   Axum Backend   │
│  (frontend) │                         │   (backend)      │
└─────────────┘                         └────────┬────────┘
                                                 │
                                          ┌──────▼──────┐
                                          │  PostgreSQL  │
                                          │  (database)  │
                                          └─────────────┘
```

## Backend Crate Dependency Layering

Dependencies flow strictly downward. A crate may only import crates above it.
This is enforced by structural tests in `backend/tests/`.

```
Layer 0: allowance-types    — Shared types, enums, IDs. No business logic.
Layer 1: allowance-config   — Configuration loading. Depends on: types
Layer 2: allowance-domain   — Business rules, validation. Depends on: types
Layer 3: allowance-repo     — Database access (SQLx). Depends on: types, domain
Layer 4: allowance-service  — Orchestration. Depends on: types, config, domain, repo
Layer 5: allowance-api      — HTTP handlers. Depends on: types, config, service
```

### Rules

1. No crate may depend on a crate at a higher layer number.
2. `allowance-types` has zero internal dependencies — it is the foundation.
3. `allowance-domain` must not depend on `repo` (business rules are DB-agnostic).
4. `allowance-api` must not depend on `repo` directly — all data access goes through `service`.
5. No circular dependencies.

### Why This Matters

When AI agents generate code they tend to take shortcuts — importing whatever is
convenient. The layering rules prevent the codebase from becoming a tangled
dependency graph. Agents converge faster on correct solutions when the solution
space is mechanically constrained.

## Frontend Module Dependency Layering

Dependencies flow strictly downward. A module may only import from modules above it.

```
Layer 0: types/        — TypeScript type definitions. No internal imports.
Layer 1: utils/        — Pure utility functions. Depends on: types
Layer 2: api/          — HTTP client, request/response types. Depends on: types, utils
Layer 3: hooks/        — Custom React hooks. Depends on: types, utils, api
Layer 4: components/   — Reusable UI components. Depends on: types, utils, hooks
Layer 5: pages/        — Route-level page components. Depends on: types, utils, hooks, components
Layer 6: App.tsx       — Root component and routing. Depends on: pages, components
```

### Rules

1. No module may import from a module at a higher layer number.
2. `types/` has zero internal imports — it is the foundation.
3. `api/` is the only module that may call `fetch` or make HTTP requests.
4. `components/` must not import from `pages/` or `api/` (components are reusable
   and access data only through hooks).
5. `pages/` must not import from `api/` directly — all data access goes through `hooks/`.
6. No circular imports.

### Why Frontend Layering Matters

The same reasoning as backend layering applies. Without these constraints, agents
will import API calls directly into components, create circular dependencies between
pages and components, and scatter fetch calls throughout the codebase.

## Database

PostgreSQL. The repo layer abstracts the database; all queries use SQLx with
the `postgres` feature. Connection string is configured via `DATABASE_URL`.

Migrations managed via `sqlx-cli`. Migration files live in `backend/migrations/`.

## Authentication

Deferred for initial implementation. The architecture supports adding auth
middleware at the `api` layer without affecting lower layers.
