# Agent Workflow

How to start the container environment, assign work to agents, and validate results.

## Prerequisites

Nothing — the `bin/bootstrap` script installs everything (Homebrew, Colima, Docker, just).

## First-Time Setup

```sh
./bin/bootstrap                               # installs brew, colima, docker, just; starts colima
cp .env.containers.sample .env.containers     # optional: override defaults
just build-image                              # build the dev Docker image (~5-10 min first time)
just up                                       # start containers
just build                                    # compile backend and frontend
```

## Working with Agents

**You do not need to shell into the container.** Source code lives on your Mac.
Claude Code runs on your Mac. `just` commands run build/test/run tasks
inside the container transparently from your local terminal.

Assign work to an agent the same way you normally would: open Claude Code in
your project directory and describe the task. The agent edits source files
locally. When it needs to build, test, or run migrations, it uses `just`.

Run `just` (no args) or `just --list` to see all available commands.

## Running Dev Servers

Dev servers are long-running — open two terminals:

```sh
# Terminal 1
just dev-backend
# Expected: "Allowance API starting" then "listening on 0.0.0.0:3000"

# Terminal 2
just dev-frontend
# Expected: Vite output showing "Local: http://localhost:5173/"
```

## Validating Results

While the dev servers are running:

- Open `http://localhost:5173` in your browser — React frontend
- `curl http://localhost:3000/health` — returns `ok` when the backend is up

## Running Arbitrary Commands in the Container

```sh
just exec psql '$DATABASE_URL'
just exec bash
just exec cargo check
just exec bash -c 'cd /app/frontend && npm install'
```

## Container Lifecycle

```sh
just up             # start all containers (detached)
just down           # stop containers, keep volumes (fast restart)
just status         # show running container status
just logs           # tail all container logs
just logs dev       # tail only the dev container logs
just shell          # open a bash shell in the dev container
```

## When to Rebuild the Image

Rebuild only when `Cargo.toml`, `Cargo.lock`, or `docker/Dockerfile.dev` change:

```sh
just rebuild        # rebuild dev image and restart containers
```

For all other changes (source code edits, frontend files), cargo-watch and
Vite HMR handle recompilation automatically — no rebuild needed.

## Full Reset

To completely wipe the environment (erases the database and all compiled artifacts):

```sh
just nuke           # prompts for confirmation before destroying volumes
```

After nuking, run `just up` then `just build` to start fresh.

## Colima Management

Colima is the container runtime. It runs in the background as a VM.

```sh
just colima-start   # start the Colima VM (if it was stopped)
just colima-stop    # stop the Colima VM
just colima-status  # check Colima VM status
```

If Docker commands fail with "Cannot connect to Docker daemon", run `just colima-start`.
