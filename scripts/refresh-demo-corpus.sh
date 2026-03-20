#!/usr/bin/env bash
# Update-only (no packages, no data download): re-seed the demo corpus from existing data and restart the app.
# Does not: rebuild Docker images, run npm/pip install, or download demo data. Use when data/ already
# has documents.jsonl.7z and parquet_export/. For code updates, run 'git pull' first.
# MILVUS_ONLY=1: only reload vectors into Milvus (Mongo unchanged); needs parquet + matching Mongo doc count.
# Full bootstrap: ./scripts/one-click-demo.sh. Clean install (rebuild + re-download): CLEAN_INSTALL=1 ./scripts/one-click-demo.sh
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
ok()   { echo -e "${GREEN}  [OK]${NC} $*"; }
warn() { echo -e "${YELLOW}  [WARN]${NC} $*"; }
info() { echo -e "${CYAN}  [INFO]${NC} $*"; }
fail() { echo -e "${RED}  [FAIL]${NC} $*"; exit 1; }
section() { echo -e "\n${CYAN}=== $* ===${NC}"; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo -e "${CYAN}=== Refresh demo corpus (no download) ===${NC}"

section "Preconditions"
if [[ ! -f .env ]]; then
  fail "Missing .env. Run ./scripts/one-click-demo.sh first or copy .env.example to .env."
fi
ok ".env exists"

if [[ "${MILVUS_ONLY:-}" == "1" ]]; then
  if ! find "$REPO_ROOT/data/parquet_export" -name "part-*.parquet" -print -quit 2>/dev/null | grep -q .; then
    fail "MILVUS_ONLY=1 requires parquet under data/parquet_export/. Run download-demo-data.sh if missing."
  fi
  ok "Parquet present for Milvus-only seed"
else
  if [[ ! -f data/documents.jsonl.7z ]] && [[ ! -f data/documents.jsonl ]]; then
    fail "No demo data in data/. Run ./scripts/download-demo-data.sh first (or ./scripts/one-click-demo.sh for full setup)."
  fi
  ok "Demo data present in data/"
fi

set -a
# shellcheck source=/dev/null
source .env 2>/dev/null || true
set +a

section "Seeding (pre-vectorized only, no vectorization pipeline)"
if [[ "${MILVUS_ONLY:-}" == "1" ]]; then
  info "Milvus-only: upserting vectors from parquet (Mongo unchanged)."
  SEED_EXTRA=(--milvus-only)
else
  info "Re-seeding from existing 7z + parquet; no download."
  SEED_EXTRA=()
fi

export MONGODB_URI="mongodb://teleoscope:${MONGODB_PASSWORD:-teleoscope_dev_password}@localhost:27017/teleoscope?directConnection=true&serverSelectionTimeoutMS=5000&authSource=admin"
MILVUS_PORT=$(docker compose port milvus 19530 2>/dev/null | cut -d: -f2)
export MILVUS_URI="http://localhost:${MILVUS_PORT:-19530}"

seed_out=""
if command -v mamba &>/dev/null && mamba run -n teleoscope true 2>/dev/null; then
  info "Running seed via mamba run -n teleoscope..."
  seed_out=$(MONGODB_URI="$MONGODB_URI" MILVUS_URI="$MILVUS_URI" mamba run -n teleoscope bash -c "cd '$REPO_ROOT' && PYTHONPATH=. python scripts/seed-demo-corpus.py ${SEED_EXTRA[*]}" 2>/dev/null) || true
fi
if [[ -z "$seed_out" ]] && command -v micromamba &>/dev/null && micromamba run -n teleoscope true 2>/dev/null; then
  info "Running seed via micromamba run -n teleoscope..."
  seed_out=$(MONGODB_URI="$MONGODB_URI" MILVUS_URI="$MILVUS_URI" micromamba run -n teleoscope bash -c "cd '$REPO_ROOT' && PYTHONPATH=. python scripts/seed-demo-corpus.py ${SEED_EXTRA[*]}" 2>/dev/null) || true
fi
if [[ -z "$seed_out" ]]; then
  info "Running seed with current Python..."
  seed_out=$(cd "$REPO_ROOT" && PYTHONPATH=. python scripts/seed-demo-corpus.py "${SEED_EXTRA[@]}" 2>/dev/null) || true
fi

if [[ -z "$seed_out" ]]; then
  fail "Could not seed. Ensure mamba env teleoscope is available (mamba activate teleoscope) and Mongo (and Milvus if desired) are reachable."
fi
ok "Seed script finished"

DEMO_WORKSPACE_ID=$(echo "$seed_out" | grep 'DEMO_CORPUS_WORKSPACE_ID=' | tail -1 | sed 's/.*DEMO_CORPUS_WORKSPACE_ID=//' | tr -d '\r')
if [[ -z "$DEMO_WORKSPACE_ID" ]] && [[ -f "$REPO_ROOT/.demo_corpus_workspace_id" ]]; then
  DEMO_WORKSPACE_ID=$(cat "$REPO_ROOT/.demo_corpus_workspace_id" | tr -d '\r\n')
  info "Read DEMO_CORPUS_WORKSPACE_ID from .demo_corpus_workspace_id"
fi
if [[ -n "$DEMO_WORKSPACE_ID" ]]; then
  ok "Workspace ID: $DEMO_WORKSPACE_ID (app can also auto-discover by label \"Demo corpus\")"
  section "Update .env (optional)"
  info "Writing DEMO_CORPUS_WORKSPACE_ID to .env..."
  if grep -q '^DEMO_CORPUS_WORKSPACE_ID=' .env 2>/dev/null; then
    if [[ "$(uname)" = Darwin ]]; then
      sed -i '' "s|^DEMO_CORPUS_WORKSPACE_ID=.*|DEMO_CORPUS_WORKSPACE_ID=$DEMO_WORKSPACE_ID|" .env
    else
      sed -i "s|^DEMO_CORPUS_WORKSPACE_ID=.*|DEMO_CORPUS_WORKSPACE_ID=$DEMO_WORKSPACE_ID|" .env
    fi
    ok "Updated DEMO_CORPUS_WORKSPACE_ID in .env"
  else
    echo "DEMO_CORPUS_WORKSPACE_ID=$DEMO_WORKSPACE_ID" >> .env
    ok "Appended DEMO_CORPUS_WORKSPACE_ID to .env"
  fi
else
  warn "Could not parse workspace ID from seed output. App will auto-discover demo corpus by label \"Demo corpus\" in Mongo."
fi

section "Restart app"
info "Recreating app container..."
docker compose up -d --force-recreate app
ok "App container recreated"

echo ""
echo -e "${GREEN}=== Demo corpus refreshed ===${NC}"
echo "  App is restarting; open http://localhost:3000/demo when ready."
echo ""
