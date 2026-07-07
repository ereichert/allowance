---
name: sync-develop
description: Sync the local develop branch after a PR merges and clean up fully-merged local feature branches. Use after confirming a PR has been merged.
allowed-tools: Bash(git *)
disable-model-invocation: true
---

# Sync Develop

Bring the local `develop` branch up to date after a merge and remove local
branches that are now fully merged into it.

## Steps

1. Run `git status` to check for uncommitted changes. If there are any,
   stop and tell the user — do not switch branches over dirty state.
2. Run `git checkout develop`.
3. Run `git pull origin develop`.
4. Run `git branch --merged develop` to list local branches fully merged
   into `develop`, excluding `main` and `develop` themselves.
5. Delete each merged branch with `git branch -d <branch>` (never `-D`).
   `-d` only succeeds when git itself confirms the branch is fully merged,
   so this step can't discard unmerged work.
6. Run `git branch -vv` and report any remaining local branches that are
   *not* merged into `develop` — these may be stale work-in-progress the
   user should look at, not something to delete automatically.

## Important

- Never delete `main` or `develop`.
- Never use `git branch -D` (force delete) — only `-d`.
- Never force push or run other destructive git commands.
- If `git pull` fails (e.g. diverged history, conflicts), stop and report
  the error rather than trying to resolve it automatically.
