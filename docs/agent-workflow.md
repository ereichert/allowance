# Agent Workflow

How to start the container environment, assign work to agents, and validate results.

## Prerequisites

Nothing — the `bin/bootstrap` script installs everything (Homebrew, Colima, Docker, just) and
installs the project's git hooks (see [Git Hooks](#git-hooks)).

## First-Time Setup

```sh
./bin/bootstrap                               # installs brew, colima, docker, just; starts colima
cp .env.containers.sample .env.containers     # optional: override defaults
just build-image                              # build all container images (~5-10 min first time)
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

Dev servers start automatically when the containers come up — no extra terminals needed.

```sh
just up
```

Both the backend (port 3000) and frontend (port 5173) start as separate Compose services
and restart automatically if they crash.

To watch their output:

```sh
just logs backend     # stream backend logs
just logs frontend    # stream frontend logs
just logs             # stream all container logs (backend + frontend + postgres)
```

## Validating Results

While the dev servers are running:

- Open `http://localhost:5173` in your browser — React frontend
- `curl http://localhost:3000/health` — returns `ok` when the backend is up

## Git Hooks

`bin/bootstrap` runs `just install-hooks`, which points git at the checked-in
`.githooks/` directory (`core.hooksPath`). The `pre-commit` hook there runs
`just precommit` (`fmt-check` + `lint`) before every commit, so unformatted or
lint-failing code can't be committed. Fix reported issues with `just fmt`, then
re-commit. Bypass intentionally with `git commit --no-verify`.

If you set up the repo before this hook existed, run `just install-hooks` once
to opt in.

## Comment Audits

The `/audit-comments` skill checks comments against the project's why-not-what
rule (see [Style Guide § Comments](style-guide.md)). It's invokable by a human
(`/audit-comments`) or an agent (via the Skill tool), and takes an optional
scope: a PR number, a file or directory path, or — with no argument — the
current uncommitted changes. It only reports violations; it does not edit
files.

Run it before committing. It is not currently wired into the pre-commit hook
or the Stop hook — it's a deliberate, on-demand check, not an automatic gate.

## Development Workflow

The `/develop` skill drives the full delivery workflow for a GitHub issue or
an inline spec: `/develop 42` or `/develop <description of the change>`.

1. **Resolve** — finds or (with confirmation) creates the GitHub issue, then
   reads recorded state (plan, sub-issues, open PRs) so a re-trigger resumes
   wherever work left off.
2. **Plan** — enters plan mode until the plan is accepted; skipped, with
   confirmation, when the work is trivial or a plan is already recorded. The
   accepted plan is posted as a comment on the issue. Work expected to exceed
   500 changed lines (tests included) is split into GitHub sub-issues, one PR
   each.
3. **Deliver** — per issue: failing tests first, implement to green, format,
   lint, comment audit, commit, PR — the [Task Completion
   Checklist](#task-completion-checklist) below, in order.
4. **Review** — runs `/review-pr` on the PR and addresses findings, up to
   three cycles. Findings still unresolved after three cycles escalate: the
   PR gets a `needs-human` label and a summary comment, and the agent stops.

The agent never merges. When a PR is review-clean it hands off and stops;
after you merge, re-trigger `/develop <issue number>` to continue with the
next sub-issue.

## Task Completion Checklist

Before ending any task that modifies code:

- [ ] `just test` passes with no failures
- [ ] `just lint` passes (clippy + ESLint, zero warnings)
- [ ] `just fmt` was run — all files are formatted
- [ ] `just test-e2e` passes, if the change touches frontend UI (optional — not yet part of the `just test` gate the Stop hook checks; see below)
- [ ] All new list endpoints support pagination and at least one filter
- [ ] All multi-row database writes use transactions; bulk inserts where applicable
- [ ] Both happy paths and error paths have test coverage
- [ ] No test contains inline comments explaining what it does — rename or extract instead
- [ ] Ran `/audit-comments` and addressed any violations — see [Comment Audits](#comment-audits) above
- [ ] Use `/commit` to commit (never `git commit` directly)
- [ ] A GitHub issue exists for this task (create with `gh issue create` if not)
- [ ] PR opened with `gh pr create` referencing the issue number

`just test` is the final gate. If the Stop hook fires and reports failures, fix them before closing the session. `just test-e2e` is a separate, optional recipe — it requires the `frontend` and `backend` containers running (not just `dev`) and is not part of the Stop-hook gate yet.

## Agent-Driven Browser Verification

For interactive verification in a real browser (not a checked-in test), the Playwright MCP server is registered in `.mcp.json` and runs headless inside the `dev` container. It lets an agent navigate, read the accessibility tree, click, and screenshot the running app directly — useful for confirming a UI change actually works before writing (or in addition to) a Playwright Test spec. This doesn't block a human from independently opening `http://localhost:5173` per "Validating Results" above — the two are separate browser sessions.

Because that browser runs inside the `dev` container's own network namespace, `localhost`/`127.0.0.1` resolve to the `dev` container itself, not the host — navigate to the compose-network hostnames instead: `http://frontend:5173` for the app, `http://backend:3000` for direct API calls. See [Design Decisions](design-decisions.md) for the full rationale.

For the checked-in regression suite, run `just test-e2e` (requires `just up` first so `frontend`/`backend` are reachable). Specs live in `frontend/tests/e2e/`; the HTML report is written to `frontend/playwright-report/` and a JUnit XML report to `frontend/test-results/junit.xml` for future CI consumption.

## Running Arbitrary Commands in the Container

`exec` takes a single argument, so always wrap the command in single quotes —
this lets compound commands (`&&`, `|`, `;`) run entirely inside the
container instead of being split across the host/container boundary.

```sh
just exec 'psql $DATABASE_URL'
just exec 'bash'
just exec 'cargo check'
just exec 'cd /app/frontend && npm install'
```

Raw `docker`/`docker compose` calls that have a `just` equivalent (`ps`,
`restart`, `logs`, `up`, `down`, `build`, `exec`, `config`) are blocked by a
`PreToolUse` hook (`.claude/hooks/block-docker-compose-bypass.sh`) — see
[Design Decisions](design-decisions.md).

## Container Lifecycle

```sh
just up               # start all containers (detached) — backend + frontend start automatically
just down             # stop containers, keep volumes (fast restart)
just status           # show running container status
just compose-config   # render the fully-resolved compose configuration
just logs             # tail all container logs
just logs backend     # tail backend logs only
just logs frontend    # tail frontend logs only
just logs dev         # tail the dev shell container logs
just shell            # open a bash shell in the dev container
```

## When to Rebuild the Image

Rebuild only when `Cargo.toml`, `Cargo.lock`, `docker/Dockerfile.dev` change, or `frontend/package.json`'s `@playwright/test`/`@playwright/mcp` versions are bumped (the Dockerfile's pinned Chromium version must move in lockstep):

```sh
just rebuild        # rebuild all container images and restart containers
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
