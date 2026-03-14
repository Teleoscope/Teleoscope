#!/usr/bin/env bash
# Download Teleoscope demo data from https://github.com/Teleoscope/teleoscope-demo-data
# into the project's data/ folder. Uses a shallow clone to avoid pulling full history.
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
ok()   { echo -e "${GREEN}  [OK]${NC} $*"; }
warn() { echo -e "${YELLOW}  [WARN]${NC} $*"; }
info() { echo -e "${CYAN}  [INFO]${NC} $*"; }
fail() { echo -e "${RED}  [FAIL]${NC} $*"; exit 1; }

REPO_URL="${TELEOSCOPE_DEMO_DATA_REPO:-https://github.com/Teleoscope/teleoscope-demo-data.git}"
BRANCH="${TELEOSCOPE_DEMO_DATA_BRANCH:-main}"
DATA_DIR="${1:-$(git rev-parse --show-toplevel 2>/dev/null)/data}"
DATA_DIR="${DATA_DIR:-$(cd "$(dirname "$0")/.." && pwd)/data}"

echo -e "${CYAN}=== Download demo data ===${NC}"
info "Target directory: $DATA_DIR"
info "Repo: $REPO_URL (branch: $BRANCH)"

if [[ ! -d "$DATA_DIR" ]]; then
  info "Creating data directory: $DATA_DIR"
  mkdir -p "$DATA_DIR"
  ok "Created $DATA_DIR"
else
  ok "Data directory exists: $DATA_DIR"
fi

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT
info "Using temp dir: $TMP_DIR"

info "Cloning (shallow, depth=1)..."
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$TMP_DIR"
ok "Clone finished"

info "Copying into $DATA_DIR (excluding .git)..."
if command -v rsync &>/dev/null; then
  rsync -a --exclude='.git' "$TMP_DIR/" "$DATA_DIR/"
  ok "Copied with rsync"
else
  for f in "$TMP_DIR"/* "$TMP_DIR"/.[!.]*; do
    [[ -e "$f" && "$(basename "$f")" != ".git" ]] && cp -R "$f" "$DATA_DIR/"
  done
  ok "Copied with cp"
fi

echo ""
ok "Demo data is in $DATA_DIR"
info "Contents:"
ls -la "$DATA_DIR"
echo -e "${GREEN}=== Done ===${NC}"
