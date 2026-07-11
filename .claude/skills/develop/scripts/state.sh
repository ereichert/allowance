#!/usr/bin/env bash
set -euo pipefail

for dep in gh jq; do
  command -v "$dep" > /dev/null || {
    echo "error: $dep is required — run bin/bootstrap" >&2
    exit 2
  }
done

issue="${1:?usage: state.sh <issue number>}"

repo_json="$(gh repo view --json owner,name)"
owner="$(jq -r '.owner.login' <<<"$repo_json")"
name="$(jq -r '.name' <<<"$repo_json")"

gh api graphql \
  -f query='
    query($owner: String!, $name: String!, $issue: Int!) {
      repository(owner: $owner, name: $name) {
        issue(number: $issue) {
          number
          title
          state
          body
          parent { number title }
          subIssues(first: 50) { nodes { number title state } }
          comments(first: 100) { nodes { body } }
        }
      }
    }' \
  -f owner="$owner" -f name="$name" -F issue="$issue" \
  --jq '
    .data.repository.issue |
    "ISSUE \(.number) \(.state) \(.title)",
    "PARENT \(if .parent then "\(.parent.number) \(.parent.title)" else "none" end)",
    "PLAN \(if any(.comments.nodes[]; .body | contains("<!-- develop:plan -->")) then "recorded" else "none" end)",
    (.subIssues.nodes[] | "SUB_ISSUE \(.number) \(.state) \(.title)"),
    "BODY:",
    .body
  '

echo
echo "PRS:"
gh pr list --state all --limit 100 --json number,state,isDraft,headRefName,title |
  jq -r --arg branch "feature/gh-$issue-" '
    .[] | select(.headRefName | startswith($branch)) |
    "PR \(.number) \(.state)\(if .isDraft then " DRAFT" else "" end) \(.headRefName) \(.title)"
  '

echo
echo "LOCAL:"
echo "BRANCH $(git branch --show-current)"
if git status --porcelain | grep -q .; then
  echo "WORKTREE dirty"
else
  echo "WORKTREE clean"
fi
