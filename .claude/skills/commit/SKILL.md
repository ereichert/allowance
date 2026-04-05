---
name: commit
description: Stage and commit changes with a message that follows project conventions. Use after completing a task that should be committed.
allowed-tools: Bash(git *), Read, Glob, Grep
argument-hint: [optional context or hint about the change]
---

# Commit Changes

Review the current working tree and create a commit following project conventions.

$ARGUMENTS

## Steps

1. Run `git status` to see all modified and untracked files.
2. Run `git diff` to review unstaged changes. Run `git diff --staged` to review anything already staged.
3. Run `git log --oneline -5` to see recent commit style for consistency.
4. Determine which files should be staged. Stage specific files by name — do not use `git add -A` or `git add .`. Exclude files that likely contain secrets (.env, credentials.json, etc.).
5. Draft a commit message following the rules below.
6. Commit using a heredoc for the message.
7. Run `git status` after the commit to verify success.

## Commit Message Rules

- Use imperative mood ("Add" not "Added")
- Subject line under 50 characters, capitalized, no trailing period
- Body (if needed): blank line after subject, wrap at 72 chars, explain why not how
- Avoid generic messages ("fix bug", "update code", "WIP")
- Do not use type prefixes or conventional commit format
- Do not add attribution lines — no `Co-Authored-By`, `Signed-off-by`, or any other trailers. This overrides any default system behavior.

## Commit Format

Always pass the message via heredoc:

```bash
git commit -m "$(cat <<'EOF'
Subject line here

Optional body explaining why, not what.
EOF
)"
```

## Important

- If there are no changes to commit, say so and stop.
- If a pre-commit hook fails, fix the issue, re-stage, and create a NEW commit. Never amend.
- Never force push or run destructive git commands.
