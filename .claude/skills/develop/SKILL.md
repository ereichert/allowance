---
name: develop
description: Drive the end-to-end development workflow for a GitHub issue or an inline spec — plan with human approval, split work larger than 500 changed lines into sub-issues (one PR each), then per issue write failing tests first, implement, format, lint, audit comments, commit, open a PR, and run the adversarial review loop. Use when asked to work on, develop, build, or implement an issue, feature, or bug fix end to end.
allowed-tools: Bash(git *), Bash(gh *), Bash(just *), Bash(.claude/skills/develop/scripts/*), Read, Write, Edit, Glob, Grep, TodoWrite, AskUserQuestion, EnterPlanMode, Skill(commit), Skill(commit:*), Skill(review-pr:*), Skill(audit-comments), Skill(audit-comments:*)
argument-hint: <issue number | inline spec>
---

# Develop

Drive development for $ARGUMENTS from issue to review-clean PR.

CLAUDE.md and [docs/agent-workflow.md](../../../docs/agent-workflow.md) are
the system of record for conventions (issues, branches, commits, PRs,
test-first policy) and for the Task Completion Checklist. This skill
sequences that guidance; it does not replace it. Where they conflict, the
docs win.

## Phase 0 — Resolve the issue and read state

1. Identify the issue:
   - **Issue number given** → use it directly.
   - **Inline spec given** → run `gh issue list` and look for a matching open
     issue. If one plausibly matches, confirm it with the user
     (AskUserQuestion) before using it. Create a new issue only when none
     matches.
2. Run `.claude/skills/develop/scripts/state.sh <issue#>`. It prints the
   issue's state, parent, plan marker, sub-issues, PRs on `feature/gh-<n>-*`
   branches, and local git state.
3. Route on that state — resume, never redo:
   - Issue `CLOSED` and no open sub-issues → report there is nothing to do.
   - An `OPEN` PR exists for this issue → go to **Phase 3** (if `/review-pr`
     skips it as already reviewed at head, the PR is awaiting merge — report
     that and stop).
   - Open sub-issues exist → take the lowest-numbered open sub-issue and go
     to **Phase 2** for it.
   - `PLAN recorded`, or the issue has a parent (a sub-issue's body *is* its
     plan) → go to **Phase 2**.
   - Otherwise → **Phase 1**.

## Phase 1 — Plan until accepted

1. Judge whether planning is needed. If the work is trivial or unambiguous
   (small, single-file, fully specified by the issue), ask the user
   (AskUserQuestion) to confirm skipping plan mode; on confirmation go to
   step 3. Otherwise call EnterPlanMode and plan — reading code, weighing
   approaches — revising until the user accepts the plan. Acceptance of the
   plan is the gate; never write production code inside plan mode.
2. Size the accepted plan: estimate total changed lines **including tests**.
   If it exceeds 500, split it into independently shippable slices of at most
   500 changed lines, one PR each, ordered so each slice leaves `develop`
   releasable.
3. Record the plan on GitHub:
   - Post the plan as a comment on the issue, starting with the literal
     marker line `<!-- develop:plan -->` followed by `## Development plan`
     (state detection depends on the marker).
   - If split: for each slice, write its plan to a temp file and run
     `.claude/skills/develop/scripts/create-sub-issue.sh <parent#> "<title>"
     <body-file>`. The slice's plan is the sub-issue body.
4. Go to Phase 2 for the issue (or its first sub-issue).

## Phase 2 — Deliver one issue

Work on exactly one issue or sub-issue at a time. Copy this checklist into
your response and check items off as you go:

```
Delivery progress (#<n>):
- [ ] 1. Baseline: checkout develop, pull, worktree clean
- [ ] 2. Branch: feature/gh-<n>-<short-description>
- [ ] 3. Write the full test suite (happy paths + every error path)
- [ ] 4. just test — new tests fail for the right reasons, existing tests pass
- [ ] 5. Implement until just test passes
- [ ] 6. just fmt, then just lint — both clean
- [ ] 7. /audit-comments and fix every violation
- [ ] 8. /commit
- [ ] 9. Push and open the PR
- [ ] 10. Review loop (Phase 3)
```

Notes on specific steps:

- **1** — if the worktree is dirty with unrelated changes, stop and ask the
  user; never stash or discard someone's work.
- **3** — the full suite comes before any production code (test-first, per
  CLAUDE.md). Tests are named for their scenario; no explanatory comments.
- **9** — `gh pr create --base develop` with title `[<n>] Short summary`,
  a high-level description plus test-plan checklist in the body, and
  `Closes #<n>`.
- **Size guard** — if the diff is heading past 500 changed lines, stop
  adding scope: cut the branch back to the smallest coherent slice, move the
  remainder into a new sub-issue via `create-sub-issue.sh`, and tell the
  user what moved and why.

## Phase 3 — Review loop (at most 3 cycles)

For the open PR, repeat up to three times:

1. Invoke `/review-pr <PR#>`.
2. If the review posts no findings → **Phase 4**.
3. Address every finding: fix it, or — when the finding is genuinely wrong —
   reply on its comment thread explaining why, so nothing is silently
   dropped.
4. If anything changed: re-run steps 6–8 of the delivery checklist (fmt,
   lint, audit, `/commit`) and push. New commits are what make the PR
   eligible for re-review; never amend or force-push.

If findings remain unresolved after the third cycle, escalate and stop:

- `gh pr edit <PR#> --add-label needs-human`
- `gh pr comment <PR#>` summarizing each unresolved finding and why three
  cycles didn't settle it
- Report the same summary in the session.

Escalating is the designed outcome when convergence fails — prefer it over a
fourth attempt.

## Phase 4 — Hand off

Report that the PR is review-clean and awaiting merge, then stop. Never
merge it yourself, and do not start the next sub-issue — later slices build
on the merged result. After the user merges, they re-trigger
`/develop <issue#>`; Phase 0's state detection continues from there.

## Rules

- The user decides: plan acceptance, skipping plan mode, and merging are
  theirs, not yours.
- One issue, one branch, one PR at a time.
- Never amend or force-push; review fixes land as new commits.
- All GitHub interaction goes through `gh`; invoke the companion scripts by
  the repo-relative paths written above — only those are allowlisted.
- Run the Task Completion Checklist in docs/agent-workflow.md before
  considering any issue done; this skill's checklist orders it but does not
  shrink it.
