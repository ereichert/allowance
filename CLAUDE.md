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
│   │   ├── allowance-domain/ # Core types, enums, business rules, and domain models
│   │   ├── allowance-config/ # Configuration loading (reads LISTEN_ADDR, DATABASE_URL)
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
domain → config → repo → service → api
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

## Test-First Development (ENFORCED)

All agents MUST write the full test suite for a feature or change **before writing any production code**. Tests define the expected behavior; implementation follows.

This applies to every layer: domain logic, repository, service, API handlers, and frontend components/hooks.

### Test Coverage Requirements

- Cover both happy paths and every documented error path. A test suite with no error-path coverage is incomplete.
- Tests must be self-descriptive. Name the test to describe the scenario; do not add comments inside test bodies to explain what is being tested.
- Backend tests and frontend tests are separate concerns. Never mix them in the same file or test run.
- Run `just test` and verify it passes before considering any code-changing task complete.

Exceptions (no test required):

- Pure configuration or wiring (e.g., adding a route to a router that delegates entirely to already-tested handlers)
- Generated or third-party code

## Key Conventions

### Rust (backend)

- Format with `rustfmt`, lint with `clippy` (deny warnings)
- All public types derive `Debug, Clone, Serialize, Deserialize` where applicable
- Error handling: use `thiserror` for library errors, `anyhow` only in main/tests
- Structured logging via `tracing`
- Tests live in `tests/` submodules within each crate, plus integration tests in `backend/tests/`
- Database writes touching multiple rows must use a transaction. Prefer bulk `INSERT ... VALUES (...)` over per-row inserts in loops.

### TypeScript (frontend)

- Format with Prettier, lint with ESLint
- Functional components only, hooks for state
- API calls go through a single client module (`src/api/`)
- No `any` — use explicit types or `unknown`

### Both

- Names are descriptive: no abbreviations except universally known ones (id, url, api)
- Every public function/component has a brief doc comment explaining *why* it exists
- Every list endpoint must support pagination and at least one filter parameter. See [API Contracts](docs/api-contracts.md) for the required envelope shape.
- Follow naming conventions exactly as specified in [Style Guide](docs/style-guide.md). Violations are not acceptable.

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

## GitHub Integration

Use `gh` for **all** GitHub interactions (issues, PRs, labels, milestones). Do not use the GitHub web UI or direct API calls.

### Issues

Every feature or bug fix must have a corresponding GitHub issue.

- If the user explicitly provides an issue number, use it directly.
- Otherwise, check for an existing open issue (`gh issue list`) and **confirm the correct issue with the user** before proceeding.
- Only create a new issue (`gh issue create`) if none exists.

Reference the issue number in branch names: `feature/gh-123-short-description`

Every commit message must use this format:

```text
[gh-<issue #>] Short summary of commit content.
```

### Pull Requests

When work is ready for review, open a PR targeting `develop`:

```sh
gh pr create --base develop
```

- **Title format**: `[<issue #>] Short summary` (same as commit format, without the `gh-` prefix)
- **Body**: a high-level, human-readable description of the change (surface-level technical details) followed by a test plan checklist

Add `Closes #<number>` in the PR body to automatically close the issue on merge. To close manually after merge: `gh issue close <number>`.
