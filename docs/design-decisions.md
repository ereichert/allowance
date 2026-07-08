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

A `PreToolUse` hook (`.claude/hooks/block-docker-compose-bypass.sh`) enforces this for agents: it denies raw `docker`/`docker compose` calls that have a direct `just` equivalent, redirecting to the right recipe. Without it, nothing stopped an agent from reaching for `docker compose ps` instead of `just status` — the single-interface benefit only holds if it's actually used.

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

The `frontend` Compose service's startup command uses `npm ci` instead, not `npm install`. `npm ci` fails on a stale lockfile rather than rewriting it. That matters for the service specifically because it runs unattended on every container start and every crash-triggered `restart: unless-stopped` — there is no human present to notice or commit a lockfile drift. The `just` recipes run under an operator's eye, so a self-correcting `npm install` is safe there.

---

## Separate Cargo Target Directory for the `backend` Service

**Decision:** The `backend` service does not share the `dev` container's `backend-target` volume. It sets `CARGO_TARGET_DIR=/app/backend/target-bg`, backed by its own `backend-target-bg` volume.

Cargo serializes writes to a target directory with a file lock. `backend` runs `cargo watch` continuously; if it shared `backend-target` with `dev`, a host-triggered `just build` or `just test` would block silently on that lock whenever `cargo watch` was mid-recompile, with no output or timeout to explain why. The two containers never need each other's build artifacts, so giving `backend` its own target directory removes the contention entirely.

---

## `just exec` Without `--`

**Decision:** The `exec` recipe passes args directly to `docker compose exec dev`, without a `--` separator.

Docker Compose v2 does not accept `--` as an argument separator (it treats it as a literal argument and fails). The correct usage is `just exec bash -c 'cd /app && echo hello'` with no separator.

---

## Playwright for Browser Verification, Split by Use Case

**Decision:** Use Playwright as the browser-automation engine, split into two entry points: Playwright MCP for interactive, agent-driven verification, and Playwright Test for a checked-in regression suite (`just test-e2e`).

An evaluation (tracked in issue #36) ruled out chrome-cli — it's macOS-only and cannot run on Linux CI runners (Jenkins/CircleCI), which this project's requirements explicitly call for — and several AI-native browser agents (Stagehand, browser-use), which solve an "unknown DOM" problem this project doesn't have; their runtime LLM-driven reasoning is unnecessary cost and non-determinism against a known, first-party app. Playwright MCP lets an agent drive a real browser turn-by-turn (navigate, read the accessibility tree, click, screenshot) for verifying work during development — the actual capability requested. Playwright Test produces JUnit/HTML/trace reports, so a future CI wiring is a config-only addition, not a rework.

`just test-e2e` is a separate recipe, not folded into `just test`: e2e tests require the `frontend` and `backend` containers up and reachable (today's `just test` only requires `dev`, per `_check-dev`) and are slower. It is not yet part of the Stop-hook gate.

Chromium is baked directly into `docker/Dockerfile.dev` (`npx playwright@<version> install --with-deps chromium`) rather than installed into a runtime-populated volume. The binary lives in the image layer, so it survives container restarts automatically and is only invalidated by `just rebuild` — exactly when a version bump should take effect. `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` makes any drift between the image's pinned version and `frontend/package.json`'s `@playwright/test` version fail loudly at install time instead of silently attempting a network re-download.

The Playwright MCP server (`.mcp.json`) runs *inside* the `dev` container via `docker compose exec -T -w /app/frontend`, not via host-side `npx`, matching this project's "everything goes through `just`/the container" convention (see CLAUDE.md) and avoiding an undeclared host Node dependency. The explicit `-w /app/frontend` matters: `@playwright/mcp` is a `frontend` devDependency, but `docker compose exec`'s default working directory is `/app` (the repo root), so `npx --no-install` can't find it without the override. It runs headless (`dev` has no display) — this doesn't prevent a human from independently verifying the same change by opening `http://localhost:5173` in their own browser, per the existing "Validating Results" workflow.

`@playwright/mcp`'s `--browser` flag only accepts channel names (`chrome`, `firefox`, `webkit`, `msedge`) — there is no `chromium` value, and passing one is silently ignored, falling back to the `chrome` channel, which requires a separate Google Chrome/Chrome-for-Testing binary that was never installed (only plain Chromium was, per the image decision above). The fix is `--executable-path`, pointed directly at the Chromium binary baked into the image, resolved dynamically (`find /root/.cache/ms-playwright -maxdepth 1 -name 'chromium-*' -type d`) rather than hardcoding Playwright's internal revision-numbered directory name (e.g. `chromium-1228`), so a future version bump doesn't silently break the path.

`frontend/vitest.config.ts` explicitly excludes `tests/e2e/**` (`exclude: [...configDefaults.exclude, 'tests/e2e/**']`). Without this, vitest's default file discovery also picks up Playwright spec files (they match the same `*.spec.ts` pattern) and fails with "Playwright Test did not expect test() to be called here" — the two runners' `test()`/`expect` are different objects. `npm run test:architecture` was unaffected (it only scans `src/`).

---

## Relative API Base URL + Vite Proxy (not an absolute per-environment URL)

**Decision:** `frontend/src/api/client.ts` calls the API via a relative path (`/api/v1`), and `frontend/vite.config.ts` proxies `/api` server-side to `http://backend:3000`.

Discovered while wiring up Playwright: the app previously called a hardcoded absolute URL (`http://localhost:3000/api/v1`), which only worked because a human's host browser has `localhost:3000` forwarded to the backend container. A Playwright browser launched *inside* the `dev` container has its own network namespace — `localhost:3000` there means the `dev` container itself, so every API call would fail. `docker-compose.yml` had set an env var (`VITE_ALLOWANCE_API_URL`) intended to make this configurable, but it didn't match the name `client.ts` actually read (`VITE_API_URL`) and was never wired to anything — dead config since the containerized dev environment was introduced.

A relative URL sidesteps the problem instead of just fixing the variable name: Vite's own dev server proxies `/api/*` to `backend:3000` server-side, so the browser (host or in-container) never needs to know the backend's address — it just asks whatever origin served the page, and that origin's Vite process makes the real hop across the Docker network.

A second, related fix was needed once Playwright actually ran: Vite's dev server rejects requests whose `Host` header it doesn't recognize (DNS-rebinding protection). A Playwright browser navigating to `http://frontend:5173` sends `Host: frontend:5173`, which isn't recognized by default and gets blocked with "This host is not allowed." `frontend/vite.config.ts` adds `server.allowedHosts: ['frontend']` to allow it.
