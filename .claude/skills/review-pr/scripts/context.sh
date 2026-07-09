#!/usr/bin/env bash
set -euo pipefail

command -v gh > /dev/null || {
  echo "error: gh is required — run bin/bootstrap" >&2
  exit 2
}

pr="${1:?usage: context.sh <PR number>}"

gh pr view "$pr" --json title,body,headRefOid,files --jq '
  "TITLE: \(.title)",
  "HEAD_SHA: \(.headRefOid)",
  "RUST: \(if any(.files[].path; endswith(".rs")) then "yes" else "no" end)",
  "TS: \(if any(.files[].path; test("\\.tsx?$")) then "yes" else "no" end)",
  "FILES:",
  (.files[] | "  \(.path) (+\(.additions) -\(.deletions))"),
  "",
  "BODY:",
  .body
'

echo
echo "DIFF (lockfiles and generated files removed):"
gh pr diff "$pr" | awk '
  /^diff --git / {
    skip = ($0 ~ /(Cargo\.lock|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|\.snap )/)
  }
  !skip
'
