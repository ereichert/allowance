# Allowance — Agent Harness

Chore management and allowance tracking application.
Rust backend (Axum) + React frontend (Vite, TypeScript).

## Quick Start

```bash
# Backend
cd backend && cargo build && cargo test

# Frontend
cd frontend && npm install && npm run dev
```

## Repository Layout

```
allowance/
├── backend/                  # Rust workspace
│   ├── crates/
│   │   ├── allowance-types/  # Shared types, no business logic
│   │   ├── allowance-config/ # Configuration loading
│   │   ├── allowance-domain/ # Business rules and domain logic
│   │   ├── allowance-repo/   # Data access (database)
│   │   ├── allowance-service/# Orchestration layer
│   │   └── allowance-api/    # HTTP handlers (Axum)
│   └── Cargo.toml            # Workspace root
├── frontend/                 # React + TypeScript (Vite)
│   └── src/
├── docs/                     # Authoritative documentation
│   ├── architecture.md       # System design and dependency rules
│   ├── data-model.md         # Entity definitions and relationships
│   ├── api-contracts.md      # REST API specification
│   └── style-guide.md        # Code conventions for Rust and TypeScript
└── CLAUDE.md                 # This file
```

## Dependency Layering (ENFORCED)

### Backend

Crates follow a strict import hierarchy. A crate may only depend on crates
above it in this list:

```
types → config → domain → repo → service → api
```

### Frontend

Modules follow a strict import hierarchy. A module may only import from
modules above it in this list:

```
types → utils → api → hooks → components → pages → App
```

Key constraints:

- Only `api/` may make HTTP calls (via `fetch`)
- `components/` must NOT import from `pages/` or `api/`
- `pages/` must NOT import from `api/` directly (use `hooks/`)

Violations will be caught by structural tests. See: [docs/architecture.md](docs/architecture.md)

## Key Conventions

### Rust (backend)
- Format with `rustfmt`, lint with `clippy` (deny warnings)
- All public types derive `Debug, Clone, Serialize, Deserialize` where applicable
- Error handling: use `thiserror` for library errors, `anyhow` only in main/tests
- Structured logging via `tracing`
- Tests live in `tests/` submodules within each crate, plus integration tests in `backend/tests/`

### TypeScript (frontend)
- Format with Prettier, lint with ESLint
- Functional components only, hooks for state
- API calls go through a single client module (`src/api/`)
- No `any` — use explicit types or `unknown`

### Both
- No single file exceeds 300 lines. Split if approaching limit.
- Names are descriptive: no abbreviations except universally known ones (id, url, api)
- Every public function/component has a brief doc comment explaining *why* it exists

## Documentation

The `docs/` directory is the system of record. When making changes that affect
architecture, data model, or API surface, update the relevant doc FIRST, then
implement. See each doc for details:

- **[Architecture](docs/architecture.md)** — system design, crate responsibilities, dependency rules
- **[Data Model](docs/data-model.md)** — entities, relationships, database schema
- **[API Contracts](docs/api-contracts.md)** — endpoints, request/response shapes, auth
- **[Style Guide](docs/style-guide.md)** — code conventions, naming, patterns

## Git Workflow

- `main` — production-ready, protected
- `develop` — integration branch
- Feature branches off `develop`, merged via PR
- Use `/commit` skill for all commits
