# Allowance — Agent Harness

Chore management and allowance tracking application.
Rust backend (Axum) + React frontend (Vite, TypeScript).

## Development Environment

The project runs in Docker. All build, test, and run commands go through `just`.

Run `just` with no arguments (or `just --list`) to see all available commands and their descriptions.

**Human validation while dev servers are running:**

- `curl http://localhost:3000/health` → `ok`
- Open `http://localhost:5173` in browser

See [docs/agent-workflow.md](docs/agent-workflow.md) for the full workflow.

## Repository Layout

```text
allowance/
├── backend/                  # Rust workspace
│   ├── crates/
│   │   ├── allowance-types/  # Shared types, no business logic
│   │   ├── allowance-config/ # Configuration loading (reads LISTEN_ADDR, DATABASE_URL)
│   │   ├── allowance-domain/ # Business rules and domain logic
│   │   ├── allowance-repo/   # Data access (database)
│   │   ├── allowance-service/# Orchestration layer
│   │   └── allowance-api/    # HTTP handlers (Axum) + main.rs
│   └── Cargo.toml            # Workspace root
├── bin/
│   └── bootstrap             # One-time machine setup (installs Colima, Docker, just)
├── docker/
│   └── Dockerfile.dev        # Multi-stage dev image (cargo-chef + Node 22 + dev tools)
├── docs/                     # Authoritative documentation
│   ├── architecture.md       # System design, dependency rules, dev environment topology
│   ├── agent-workflow.md     # How to start the env and assign work to agents
│   ├── design-decisions.md   # Key architectural choices and their rationale
│   ├── data-model.md         # Entity definitions and relationships
│   ├── api-contracts.md      # REST API specification
│   └── style-guide.md        # Code conventions for Rust and TypeScript
├── docker-compose.yml        # dev + postgres services; all config via ${VAR:-default}
├── justfile                  # Single CLI for host and container
├── .env.containers.sample    # Config template — copy to .env.containers to override defaults
└── CLAUDE.md                 # This file
```

## Dependency Layering (ENFORCED)

### Backend

Crates follow a strict import hierarchy. A crate may only depend on crates
above it in this list:

```text
types → config → domain → repo → service → api
```

### Frontend

Modules follow a strict import hierarchy. A module may only import from
modules above it in this list:

```text
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

- **[Architecture](docs/architecture.md)** — system design, crate responsibilities, dependency rules, dev environment
- **[Agent Workflow](docs/agent-workflow.md)** — how to start the environment and assign work to agents
- **[Design Decisions](docs/design-decisions.md)** — key architectural choices and their rationale
- **[Data Model](docs/data-model.md)** — entities, relationships, database schema
- **[API Contracts](docs/api-contracts.md)** — endpoints, request/response shapes, auth
- **[Style Guide](docs/style-guide.md)** — code conventions, naming, patterns

## Git Workflow

- `main` — production-ready, protected
- `develop` — integration branch
- Feature branches off `develop`, merged via PR
- Use `/commit` skill for all commits
