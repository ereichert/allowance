---
name: audit-comments
description: Audit code comments against the project's why-not-what rule — flags comments that restate identifiers/code, explain what a test does, reference tasks/issues, or leave commented-out code behind. Invokable by humans or agents. Use before committing, or to review a diff, PR, file, or directory for comment quality.
allowed-tools: Bash(git *), Bash(gh *), Read, Glob, Grep
argument-hint: [PR number | file or directory path | omit to audit uncommitted changes]
---

# Audit Comments

Audit comments in the given scope against this project's comment-discipline rule: explain *why*, not *what*, and only when the why isn't already obvious from the code.

$ARGUMENTS

## Determine scope

- No arguments: audit uncommitted changes — run `git diff HEAD` (covers both staged and unstaged) across the whole repo, not just `backend/`/`frontend/`.
- A PR number: run `gh pr diff <number>` to get the full diff.
- A file or directory path: read the file(s) directly and audit every comment present, not just recently added ones.

When auditing a diff, only evaluate comment lines that were **added** (`+` lines). Do not flag a pre-existing comment the change didn't touch.

## Criteria

Flag a comment as a violation if it does any of the following:

1. **Restates the identifier or the line it annotates.** A prose paraphrase of the function/recipe/variable name, or of the line of code immediately below it, adds nothing. Example: `# Run formatting and lint checks` above a recipe named `precommit`, or `// Look up the person by id` above `find_person_by_id(id)`.
2. **Explains what the code does when the what is already obvious** from reading it. A comment should carry information the code can't: a non-obvious constraint, a workaround for a specific bug, an invariant a future editor could easily break.
3. **Explains what a test does**, instead of the test being named to say so. Any comment inside a test body describing the scenario is a violation — the fix is to rename the test or extract a helper, not to comment.
4. **References the current task, issue, or PR** (e.g. "fixes gh-52", "added for the recurrence fix"). That belongs in the commit message and PR description, not the code.
5. **Is commented-out code.** Delete it — git has history.

A comment is not a violation if it captures a genuine non-obvious *why*: a constraint, a workaround, a subtle invariant, or a reason a simpler approach won't work. The test: if the comment were deleted, would a careful reader be confused? If no, it's a violation.

This applies to every file in the repo, not just "documented" languages — Rust, TypeScript, `justfile`, Dockerfiles, CI config, and scripts all follow the same rule.

## Report

List each violation as:

```
<file>:<line> — <violation category>
    "<comment text>"
    Why: <one-sentence reason it fails>
```

End with a one-line summary: `N violation(s) found.` or `No violations found.`

This skill reports only — it does not edit files. If fixes are wanted, apply them as a separate, explicit step.

## Rules

- Do not flag comments outside the requested scope (e.g., pre-existing comments in a diff-scoped audit).
- Do not flag a doc comment that genuinely explains a non-obvious why — a false positive here erodes trust in the check.
- Quote the actual comment text and cite `file:line` so each finding is actionable without re-reading the diff.
