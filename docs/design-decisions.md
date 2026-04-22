# Design Decisions

Key architectural choices and the reasoning behind them.

---

## Container Runtime: Colima

**Decision:** Use Colima as the macOS container runtime instead of Docker Desktop.

Colima is open-source, free, and runs Docker-compatible containers via a lightweight VM. It avoids Docker Desktop's licensing constraints and resource footprint. All standard `docker` and `docker compose` commands work unchanged.

---

## Persistent Workspace Container (`sleep infinity`)

**Decision:** The `dev` container runs `sleep infinity` as its default command and stays alive indefinitely. Dev tasks run via `docker compose exec`.

The alternative — starting a new container per command — would lose compiled artifacts and environment state between invocations. With `sleep infinity`, the container is a persistent workspace: the cargo registry and node_modules volumes are warm, and `just` commands exec into it transparently from the host. Container lifecycle is explicit (`just up` / `just down`), not implicit.

The backend and frontend dev servers run in their own dedicated Compose services (`backend`, `frontend`) with `restart: unless-stopped`, leaving the `dev` container solely for tool invocations (build, test, lint, fmt, migrations).

---

## Single Context-Aware `justfile`

**Decision:** One `justfile` at the repo root, used on both the host and inside the container. It detects context via `IN_CONTAINER` (set to `"1"` in `docker-compose.yml`).

- On the host: dev task recipes check the container is running, then delegate via `docker compose exec dev just <task>`.
- Inside the container: recipes run the commands directly.

This means `just test` (and every other dev command) works identically regardless of where it is typed — the agent and the human both use the same interface.

---

## Named Volumes for Build Artifacts

**Decision:** `backend/target/` and `frontend/node_modules/` are named Docker volumes, not bind-mounted directories.

Linux binaries compiled inside the container are incompatible with macOS. If these directories were bind-mounted, the container's Linux binaries would overwrite or conflict with any macOS-native artifacts (and vice versa). Named volumes are container-local and Linux-only, so builds are always consistent.

Source code is bind-mounted (live two-way link); only the build output directories are isolated in volumes.

---

## cargo-chef for Rust Dependency Caching

**Decision:** The dev image is built in three stages using `cargo-chef`: `planner` (fingerprint deps), `cacher` (compile deps), `dev` (final image seeded with cached artifacts).

Rust dependency compilation is the dominant cost in CI and on first build. cargo-chef bakes all dependency artifacts into a Docker layer that is only invalidated when `Cargo.toml` or `Cargo.lock` changes. Editing source code reuses the cached layer and only compiles user code (~seconds, not minutes).

---

## Optional `.env.containers` with Compose Defaults

**Decision:** Every variable in `docker-compose.yml` uses `${VAR:-default}` syntax. The env file (`.env.containers`) is optional and gitignored; `.env.containers.sample` is the committed template.

The environment works out of the box with no configuration. Developers who need non-default values copy the sample file and override only what they need. The `justfile` passes `--env-file .env.containers` to compose only when the file exists.

---

## Container Health Guard (`_check-dev`)

**Decision:** Every dev task recipe on the host runs `_check-dev` before delegating to the container. `_check-dev` queries `docker compose ps` and exits with a clear message if the `dev` container is not running.

Without this guard, a missing container produces a confusing Docker error ("container not found" or similar). The guard converts that into an actionable message: `"Error: dev container is not running. Run 'just up' to start the environment."`

---

## `npm install` in Dev Task Recipes

**Decision:** `just build`, `just lint`, and `just fmt` each run `npm install` before their primary command.

The `frontend/node_modules` volume starts empty on first run and after `just nuke`. If `npm install` is not part of the recipe, the first invocation of any frontend task fails with `tsc: not found` or similar. Running `npm install` is idempotent — it is a no-op when the lockfile is satisfied — so embedding it adds negligible overhead while ensuring the task always works.

---

## `just exec` Without `--`

**Decision:** The `exec` recipe passes args directly to `docker compose exec dev`, without a `--` separator.

Docker Compose v2 does not accept `--` as an argument separator (it treats it as a literal argument and fails). The correct usage is `just exec bash -c 'cd /app && echo hello'` with no separator.
