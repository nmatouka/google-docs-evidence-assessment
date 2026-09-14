#!/usr/bin/env bash
#
# Pushes ONE add-on to its Apps Script project.
#
# The free add-on (src/) and the Climateshed add-on (climateshed-plugin/src/)
# share function names, so pushing both into one project would silently run a
# mix of the two. This script refuses every setup that could cause that.
#
# Usage: scripts/push.sh free|climateshed [--yes]
#
# One-time setup per add-on: copy .clasp.json.example to .clasp.json in that
# add-on's source folder and set the scriptId. .clasp.json is gitignored.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FREE_DIR="$REPO_ROOT/src"
PAID_DIR="$REPO_ROOT/climateshed-plugin/src"

fail() {
  echo "push.sh: $*" >&2
  exit 1
}

case "${1:-}" in
  free)        TARGET="$FREE_DIR" ;;
  climateshed) TARGET="$PAID_DIR" ;;
  *)           fail "usage: scripts/push.sh free|climateshed [--yes]" ;;
esac

# 1. clasp searches parent directories for .clasp.json. A config in either
#    parent folder could have a rootDir that covers both add-ons.
for stray in "$REPO_ROOT/.clasp.json" "$REPO_ROOT/climateshed-plugin/.clasp.json"; do
  if [ -e "$stray" ]; then
    fail "remove $stray. Each add-on keeps its .clasp.json inside its own source folder."
  fi
done

# 2. The add-on's own config must exist and push only its own folder.
CONFIG="$TARGET/.clasp.json"
if [ ! -f "$CONFIG" ]; then
  fail "missing $CONFIG. Copy .clasp.json.example next to it and set scriptId."
fi
ROOT_DIR="$(sed -n 's/.*"rootDir"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$CONFIG")"
case "$ROOT_DIR" in
  ""|"."|"./") ;;
  *) fail "$CONFIG must use \"rootDir\": \".\" (found \"$ROOT_DIR\")." ;;
esac

# 3. Climateshed code must never appear in the free add-on's folder.
#    PLUGIN_EDITION is declared only in climateshed-plugin/src/Config.gs.
if grep -rq "PLUGIN_EDITION" "$FREE_DIR"; then
  fail "Climateshed code found in $FREE_DIR (PLUGIN_EDITION). Move it to climateshed-plugin/src."
fi

# 4. The two add-ons must not share a Marketplace name.
addon_name() {
  grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' "$1/appsscript.json" | head -1
}
if [ "$(addon_name "$FREE_DIR")" = "$(addon_name "$PAID_DIR")" ]; then
  fail "both appsscript.json files use the same add-on name."
fi

if ! command -v clasp >/dev/null 2>&1; then
  fail "clasp is not installed. Run: npm install -g @google/clasp"
fi

cd "$TARGET"
echo "Pushing the '$1' add-on from $TARGET"
echo "Files clasp will push:"
clasp show-file-status

if [ "${2:-}" != "--yes" ]; then
  read -r -p "Push these files? [y/N] " answer
  if [ "$answer" != "y" ]; then
    fail "cancelled."
  fi
fi

clasp push
