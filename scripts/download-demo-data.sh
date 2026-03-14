#!/usr/bin/env bash
# Download Teleoscope demo data from https://github.com/Teleoscope/teleoscope-demo-data
# into the project's data/ folder. Uses a shallow clone to avoid pulling full history.
set -euo pipefail

REPO_URL="${TELEOSCOPE_DEMO_DATA_REPO:-https://github.com/Teleoscope/teleoscope-demo-data.git}"
BRANCH="${TELEOSCOPE_DEMO_DATA_BRANCH:-main}"
DATA_DIR="${1:-$(git rev-parse --show-toplevel 2>/dev/null)/data}"
DATA_DIR="${DATA_DIR:-$(cd "$(dirname "$0")/.." && pwd)/data}"

if [[ ! -d "$DATA_DIR" ]]; then
  echo "Creating data directory: $DATA_DIR"
  mkdir -p "$DATA_DIR"
fi

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Fetching teleoscope-demo-data (branch: $BRANCH) into $DATA_DIR ..."
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$TMP_DIR"

# Copy repo contents into data/, excluding .git
if command -v rsync &>/dev/null; then
  rsync -a --exclude='.git' "$TMP_DIR/" "$DATA_DIR/"
else
  for f in "$TMP_DIR"/* "$TMP_DIR"/.[!.]*; do
    [[ -e "$f" && "$(basename "$f")" != ".git" ]] && cp -R "$f" "$DATA_DIR/"
  done
fi

echo "Done. Demo data is in $DATA_DIR"
echo "Contents:"
ls -la "$DATA_DIR"
