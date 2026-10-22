#!/usr/bin/env bash
# Checks the body of each commit in a range with the same STE rules as the documentation.
# Usage: scripts/lint-commit-bodies.sh <base> <head>
# Trailer lines (Co-Authored-By, Claude-Session, Signed-off-by) are not prose and are removed.
# Merge commits and Dependabot commits are not checked.
set -euo pipefail
cd "$(dirname "$0")/.."

base="${1:?base ref}"
head="${2:?head ref}"
vale_bin="${VALE_BIN:-}"
if [[ -z "$vale_bin" ]]; then
  if command -v vale > /dev/null 2>&1; then
    vale_bin="$(command -v vale)"
  elif [[ -x "$HOME/.local/bin/vale" ]]; then
    vale_bin="$HOME/.local/bin/vale"
  else
    echo "vale: not found. Install Vale (https://vale.sh/docs/install) or set VALE_BIN." >&2
    exit 2
  fi
fi

status=0
for sha in $(git rev-list --no-merges "$base..$head"); do
  author="$(git log -1 --format=%an "$sha")"
  if [[ "$author" == "dependabot[bot]" ]]; then
    continue
  fi
  message="$(git log -1 --format=%B "$sha")"
  trailers="$(printf '%s\n' "$message" | git interpret-trailers --parse || true)"
  if [[ -n "$trailers" ]]; then
    body="$(printf '%s\n' "$message" | grep -vxF -f <(printf '%s\n' "$trailers") || true)"
  else
    body="$message"
  fi
  if ! printf '%s\n' "$body" | "$vale_bin" --ext=.md --no-wrap; then
    echo "::error::Commit $sha: the message does not pass the STE check."
    status=1
  fi
done
exit $status
