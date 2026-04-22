# Allowance

A chore management and allowance tracking application for families. Parents create chores, assign them to children, and issue payouts when chores are completed and verified.

**This project is also an experiment in harness engineering** — building a development environment that is AI-agent-first. The tooling, conventions, and documentation are designed so that Claude Code agents can take on complete features with minimal human guidance, while still producing production-quality, well-tested code. See [docs/architecture.md](docs/architecture.md) for more on how the constraints support agent reliability.

## What It Does

- Manage a library of recurring and one-off chores with monetary values
- Assign chores to children; track status through `Pending → Completed → Verified`
- Issue scheduled or ad-hoc payouts, automatically rolled up from verified chore completions
- View per-person earnings, completion rates, and streaks

## Stack

| Layer    | Technology                                  |
|----------|---------------------------------------------|
| Frontend | React + TypeScript (Vite)                   |
| Backend  | Rust (Axum)                                 |
| Database | PostgreSQL 17                               |
| Runtime  | Docker Compose + Colima (macOS)             |
| Tasks    | `just` (single CLI for host and container)  |

## Quickstart

### Prerequisites

Run the bootstrap script once. It installs Homebrew, Colima, Docker, and `just` if they are not already present:

```sh
./bin/bootstrap
```

### First-Time Setup

```sh
cp .env.containers.sample .env.containers   # optional: override defaults
just build-image                            # build dev Docker image (~5-10 min first time)
just up                                     # start containers
just build                                  # compile backend and frontend
```

### Run the Dev Servers

Dev servers start automatically when the containers come up — no extra terminals needed:

```sh
just up
```

- **UI:** [http://localhost:5173](http://localhost:5173)
- **API health check:** `curl http://localhost:3000/health` → `ok`

To stream server output:

```sh
just logs backend     # backend only
just logs frontend    # frontend only
just logs             # all services combined
```

### Common Commands

```sh
just            # list all available commands
just test       # run all tests (backend + frontend)
just lint       # run clippy + ESLint
just fmt        # format all code
just status     # show container status
just logs       # tail all container logs
just down       # stop containers (keeps data)
just nuke       # full reset — destroys all volumes and data
```

## Documentation

All authoritative documentation lives in [docs/](docs/):

| Document | What it covers |
|----------|----------------|
| [Architecture](docs/architecture.md) | System design, dependency layering rules, dev environment topology |
| [Agent Workflow](docs/agent-workflow.md) | How to start the environment and assign work to AI agents |
| [Data Model](docs/data-model.md) | Entities, relationships, database schema |
| [API Contracts](docs/api-contracts.md) | REST endpoints, request/response shapes |
| [Design Decisions](docs/design-decisions.md) | Key architectural choices and their rationale |
| [Style Guide](docs/style-guide.md) | Code conventions for Rust and TypeScript |

## Project Structure

```text
allowance/
├── backend/                  # Rust workspace
│   ├── crates/
│   │   ├── allowance-domain/ # Core types, enums, business rules
│   │   ├── allowance-config/ # Configuration loading
│   │   ├── allowance-repo/   # Data access (SQLx + PostgreSQL)
│   │   ├── allowance-service/# Orchestration layer
│   │   └── allowance-api/    # HTTP handlers (Axum) + main.rs
│   └── Cargo.toml
├── frontend/                 # React + TypeScript (Vite)
├── docs/                     # Authoritative documentation
├── docker/
│   └── Dockerfile.dev        # Multi-stage dev image
├── docker-compose.yml
├── justfile                  # Single CLI for all tasks
└── CLAUDE.md                 # Agent instructions
```

## Harness Engineering

This project deliberately constrains the development environment so that AI agents can work reliably without constant supervision:

- **Layered dependencies** — strict import rules for both the Rust crates and frontend modules, enforced by structural tests. Agents can't create circular dependencies or access data in the wrong layer.
- **Single CLI (`just`)** — every operation (build, test, lint, migrate, run) is a `just` command. Agents always know how to invoke the toolchain.
- **Test-first mandate** — agents write tests before production code. Tests are the specification.
- **Reproducible environment** — Docker Compose + Colima means the environment is identical on every machine and across every agent session.

See [docs/agent-workflow.md](docs/agent-workflow.md) for the full workflow for assigning work to agents.
