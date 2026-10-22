#!/usr/bin/env bash
# AGENTS.md and CLAUDE.md must be identical. Both files carry the instructions for AI agents.
set -euo pipefail
cd "$(dirname "$0")/.."
if cmp -s AGENTS.md CLAUDE.md; then
  echo "AGENTS.md and CLAUDE.md are identical."
else
  echo "::error::AGENTS.md and CLAUDE.md differ. Copy one file over the other."
  exit 1
fi
