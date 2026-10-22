#!/usr/bin/env bash
# Runs Vale on every file that git tracks and that Vale can read: Markdown, and the comments of
# the source files. Generated files, catalogs and licensed texts are left out.
# Vale is an external tool. Install it with your package manager (https://vale.sh/docs/install),
# or set VALE_BIN to the binary. CI downloads a pinned release (.github/workflows/ci.yml).
set -euo pipefail
cd "$(dirname "$0")/.."

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

git ls-files -z -- \
  '*.md' '*.ts' '*.tsx' '*.js' '*.mjs' '*.cjs' '*.rs' '*.kt' '*.kts' \
  '*.cpp' '*.hpp' '*.h' '*.yml' '*.yaml' '*.toml' '*.sh' '*.gradle' '*.cmake' 'CMakeLists.txt' \
  | grep -zvE '^(src/i18n/locales/|drizzle/|core/lumi-ffi-cabi/include/|core/lumi-core/tests/fixtures/|src/theme/tokens\.generated\.ts$|CODE_OF_CONDUCT\.md$|package-lock\.json$|design/package-lock\.json$)' \
  | xargs -0 "$vale_bin" --no-wrap "$@"
