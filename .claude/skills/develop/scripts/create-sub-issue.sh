#!/usr/bin/env bash
set -euo pipefail

for dep in gh jq; do
  command -v "$dep" > /dev/null || {
    echo "error: $dep is required — run bin/bootstrap" >&2
    exit 2
  }
done

usage="usage: create-sub-issue.sh <parent issue number> <title> <body-file>"
parent="${1:?$usage}"
title="${2:?$usage}"
body_file="${3:?$usage}"

[[ -f "$body_file" ]] || {
  echo "error: body file not found: $body_file" >&2
  exit 1
}

url="$(gh issue create --title "$title" --body-file "$body_file")"
child="${url##*/}"
echo "Created issue #$child: $url"

repo_json="$(gh repo view --json owner,name)"
owner="$(jq -r '.owner.login' <<<"$repo_json")"
name="$(jq -r '.name' <<<"$repo_json")"

ids="$(gh api graphql \
  -f query='
    query($owner: String!, $name: String!, $parent: Int!, $child: Int!) {
      repository(owner: $owner, name: $name) {
        parent: issue(number: $parent) { id }
        child: issue(number: $child) { id }
      }
    }' \
  -f owner="$owner" -f name="$name" -F parent="$parent" -F child="$child" \
  --jq '"\(.data.repository.parent.id)\t\(.data.repository.child.id)"')"

IFS=$'\t' read -r parent_id child_id <<<"$ids"

gh api graphql \
  -f query='
    mutation($parent: ID!, $child: ID!) {
      addSubIssue(input: { issueId: $parent, subIssueId: $child }) {
        issue { number }
      }
    }' \
  -f parent="$parent_id" -f child="$child_id" > /dev/null

echo "Linked #$child as a sub-issue of #$parent"
