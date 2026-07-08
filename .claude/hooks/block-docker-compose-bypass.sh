#!/usr/bin/env bash
# PreToolUse hook (matcher: Bash). Denies raw docker/docker compose calls that
# have a just equivalent, per docs/design-decisions.md's single-justfile-interface
# rationale. Any parsing failure below falls through to the final `exit 0`
# (allow) rather than risk blocking unrelated commands.

input="$(cat 2>/dev/null)"
command="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)"

if [ -z "$command" ]; then
    exit 0
fi

if ! printf '%s' "$command" | grep -qE '(^|&&|\|\||[;|])[[:space:]]*(sudo[[:space:]]+)?docker(-compose|[[:space:]]+compose)\b'; then
    exit 0
fi

reason="Raw docker/docker compose calls bypass this project's just interface (docs/design-decisions.md). Use the matching recipe instead:
  docker compose ps            -> just status
  docker compose restart [svc] -> just restart [svc]
  docker compose logs [svc]    -> just logs [svc]
  docker compose up            -> just up
  docker compose down          -> just down
  docker compose build         -> just build-image
  docker compose exec ...      -> just exec <command>  (wrap the command in single quotes)
  docker compose config        -> just compose-config
If none of these fit, add a new just recipe instead of calling docker/docker compose directly."

jq -n --arg reason "$reason" '{
    hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: $reason
    }
}'
exit 0
