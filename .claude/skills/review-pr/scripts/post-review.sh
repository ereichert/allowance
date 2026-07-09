#!/usr/bin/env bash
set -euo pipefail

for dep in gh jq; do
  command -v "$dep" > /dev/null || {
    echo "error: $dep is required — run bin/bootstrap" >&2
    exit 2
  }
done

pr="${1:?usage: post-review.sh <PR number> <findings.json>}"
findings="${2:?usage: post-review.sh <PR number> <findings.json>}"

jq -e 'type == "array" and all(.[]; has("title") and has("path") and has("line") and has("body"))' \
  "$findings" > /dev/null ||
  {
    echo "error: $findings must be a JSON array of {title, path, line, body} objects" >&2
    exit 1
  }

repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
count="$(jq 'length' "$findings")"

if [[ "$count" -eq 0 ]]; then
  jq -n '{
    event: "COMMENT",
    body: "### Adversarial code review\n\nNo issues found. Diff reviewed for correctness, security, Rust and TypeScript best practices, and project constraint compliance."
  }' | gh api "repos/$repo/pulls/$pr/reviews" --input - > /dev/null
  echo "Posted: no-issues review on PR #$pr"
  exit 0
fi

jq '{
  event: "COMMENT",
  body: "### Adversarial code review\n\nFound \(length) issue(s). See inline comments.",
  comments: [
    .[] | {
      path,
      line,
      side: (.side // "RIGHT"),
      body: "**\(.title)**\n\n\(.body)"
    }
    + (if .start_line and .start_line != .line
       then {start_line, start_side: (.side // "RIGHT")}
       else {} end)
  ]
}' "$findings" | gh api "repos/$repo/pulls/$pr/reviews" --input - > /dev/null

echo "Posted: review with $count inline comment(s) on PR #$pr"
