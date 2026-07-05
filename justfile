# Detect execution context: set to "1" by docker-compose.yml inside the container
in_container := env_var_or_default("IN_CONTAINER", "")

# Build the compose command, including --env-file only when .env.containers exists
_compose := if path_exists(".env.containers") == "true" {
    "docker compose --env-file .env.containers"
} else {
    "docker compose"
}

# ─── Internal helpers ────────────────────────────────────────────────────────

# Verify the dev container is running before delegating host-side dev tasks
_check-dev:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -z "{{in_container}}" ]; then
        if ! {{_compose}} ps --services --filter status=running 2>/dev/null | grep -q '^dev$'; then
            echo "Error: dev container is not running."
            echo "Run 'just up' to start the environment."
            exit 1
        fi
    fi

# ─── Colima ──────────────────────────────────────────────────────────────────
# Use './bootstrap' on a new machine to install Colima and all other prereqs.

# Start the Colima VM (if stopped)
colima-start:
    colima start

# Stop the Colima VM
colima-stop:
    colima stop

# Get the status of the Colima VM
colima-status:
    colima status

# ─── Container lifecycle ─────────────────────────────────────────────────────

# Start all containers (detached)
up:
    {{_compose}} up -d

# Stop all containers (volumes are preserved)
down:
    {{_compose}} down

# Build all container images (dev, backend, frontend)
build-image:
    {{_compose}} build

# Rebuild all container images (re-bakes Rust deps) then restart containers
rebuild: build-image up

# Show container status
status:
    {{_compose}} ps

# Tail container logs (optionally for one service: just logs dev)
logs service="":
    {{_compose}} logs -f {{service}}

# !! DESTRUCTIVE !! Stop containers and DELETE all volumes.
# Erases: database, compiled Rust artifacts, node_modules, cargo registry.
# Run 'just up' and 'just build' afterward to start fresh.
nuke:
    #!/usr/bin/env bash
    set -euo pipefail
    echo ""
    echo "  !! WARNING: DESTRUCTIVE OPERATION !!"
    echo ""
    echo "  This will stop all containers and DELETE all Docker volumes:"
    echo "    - postgres-data         (your database will be erased)"
    echo "    - backend-target        (compiled Rust artifacts, dev container)"
    echo "    - backend-target-bg     (compiled Rust artifacts, backend container)"
    echo "    - frontend-node-modules"
    echo "    - cargo-registry"
    echo ""
    echo "  You will need to run 'just up' and 'just build' afterward."
    echo ""
    read -r -p "  Type 'nuke' to confirm: " confirm
    if [ "$confirm" = "nuke" ]; then
        echo "Nuking..."
        {{_compose}} down --volumes
        echo "Done. Run 'just up' to start fresh."
    else
        echo "Aborted."
        exit 1
    fi

# ─── Dev tasks ───────────────────────────────────────────────────────────────
# On the host: verify container is running, then delegate to just inside it.
# Inside the container (IN_CONTAINER=1): run commands directly.

# Build backend (Rust) and frontend (TypeScript)
build: _check-dev
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -n "{{in_container}}" ]; then
        cd backend && cargo build
        cd ../frontend && npm install && npm run build
    else
        {{_compose}} exec dev just build
    fi

# Open a bash shell in the dev container
shell: _check-dev
    {{_compose}} exec dev bash

# Run an arbitrary command inside the dev container
# Usage: just exec psql '$DATABASE_URL'
#        just exec bash -c 'cd /app/frontend && npm install'
exec +args: _check-dev
    {{_compose}} exec dev {{args}}

# Run all tests (always runs inside the container)
test: _check-dev
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -n "{{in_container}}" ]; then
        cd backend && cargo nextest run
        cd ../frontend && npm run test:architecture && npm test
    else
        {{_compose}} exec dev just test
    fi

# Apply pending database migrations
db-migrate: _check-dev
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -n "{{in_container}}" ]; then
        cd backend && sqlx migrate run
    else
        {{_compose}} exec dev just db-migrate
    fi

# Destroy, recreate, and re-migrate the database (dev only — destructive)
db-reset: _check-dev
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -n "{{in_container}}" ]; then
        cd backend
        sqlx database drop --yes
        sqlx database create
        just db-migrate
    else
        {{_compose}} exec dev just db-reset
    fi

# Check code quality (clippy + ESLint)
lint: _check-dev
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -n "{{in_container}}" ]; then
        cd backend && cargo clippy -- -D warnings
        cd ../frontend && npm install && npm run lint
    else
        {{_compose}} exec dev just lint
    fi

# Format all code (rustfmt + prettier)
fmt: _check-dev
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -n "{{in_container}}" ]; then
        cd backend && cargo fmt --all
        cd /app/frontend && npm install && npm run format
    else
        {{_compose}} exec dev just fmt
    fi
