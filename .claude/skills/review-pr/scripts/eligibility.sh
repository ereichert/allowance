#!/usr/bin/env bash
set -euo pipefail

command -v gh > /dev/null || {
  echo "error: gh is required — run bin/bootstrap" >&2
  exit 2
}

pr="${1:?usage: eligibility.sh <PR number>}"

info="$(gh pr view "$pr" --json state,isDraft,author,reviews,headRefOid --jq '
  .headRefOid as $head |
  [
    .state,
    (.isDraft | tostring),
    .author.login,
    ([.reviews[] | select((.body | contains("Adversarial code review")) and .commit.oid == $head)] | length | tostring)
  ] | join("\t")
')"

IFS=$'\t' read -r state is_draft author reviews_at_head <<<"$info"

if [[ "$state" != "OPEN" ]]; then
  echo "SKIP: PR #$pr is $state"
  exit 0
fi

if [[ "$is_draft" == "true" ]]; then
  echo "SKIP: PR #$pr is a draft"
  exit 0
fi

case "$author" in
  dependabot* | renovate* | github-actions* | app/*)
    echo "SKIP: automated author ($author)"
    exit 0
    ;;
esac

if [[ "$reviews_at_head" != "0" ]]; then
  echo "SKIP: already adversarially reviewed at the current head commit"
  exit 0
fi

echo "ELIGIBLE"
