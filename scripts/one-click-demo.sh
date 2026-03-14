#!/usr/bin/env bash
# One-click demo bootstrap:
# 1) Start full Docker stack (rebuild images; use CLEAN_INSTALL=1 to force no-cache and re-download demo data)
# 2) Validate core services
# 3) Validate public demo endpoints
#
# CLEAN_INSTALL=1: rebuild images with --no-cache (re-download base images, npm/pip in build) and
#                  always re-download demo data. Use for a full clean install.
# Default:        use Docker cache (no package re-download if images unchanged), download demo data only if missing.
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

echo -e "${CYAN}=== One-click demo ===${NC}"

section "Environment"
if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    ok "Created .env from .env.example"
  else
    fail "Missing .env and .env.example"
  fi
else
  ok ".env exists"
fi
set -a
# shellcheck source=/dev/null
source .env 2>/dev/null || true
set +a

section "Docker stack"
if [[ -n "${CLEAN_INSTALL:-}" ]]; then
  info "CLEAN_INSTALL=1: full rebuild (no cache) and re-download demo data"
  docker compose build --no-cache
  ok "Build finished (no cache)"
  docker compose up -d
  ok "Containers started"
else
  info "Starting stack (using cache; set CLEAN_INSTALL=1 for full rebuild)"
  docker compose up -d --build
  ok "Containers up (--build)"
fi

wait_for_cmd() {
  local name="$1"
  local cmd="$2"
  local max="${3:-90}"
  local n=0
  while ! eval "$cmd" 2>/dev/null; do
    n=$((n + 1))
    if [[ $n -ge $max ]]; then
      echo -e "${RED}  [FAIL]${NC} Timeout waiting for $name"
      return 1
    fi
    sleep 2
  done
  ok "$name ready"
}

section "Waiting for services"
info "Waiting for App API (up to 120s)..."
wait_for_cmd "App API" "curl -sf --connect-timeout 2 http://localhost:3000/api/hello | rg -q hello" 120
info "Running stack connectivity check..."
wait_for_cmd "Stack connectivity" "./scripts/test-stack.sh http://localhost:3000 >/tmp/teleoscope_demo_stack_check.log" 60

section "Demo data (pre-vectorized, no vectorization pipeline)"
info "Demo uses pre-vectorized data from parquet_export/; vectorization pipeline is not run."
if [[ -n "${CLEAN_INSTALL:-}" ]]; then
  info "CLEAN_INSTALL: downloading demo data..."
  ./scripts/download-demo-data.sh
  ok "Download finished"
elif [[ ! -f data/documents.jsonl.7z ]] && [[ ! -f data/documents.jsonl ]]; then
  info "No demo data found; downloading..."
  ./scripts/download-demo-data.sh
  ok "Download finished"
else
  ok "Demo data already present in data/ (skipping download)"
fi

section "Seeding demo corpus (Mongo + Milvus)"
export MONGODB_URI="mongodb://teleoscope:${MONGODB_PASSWORD:-teleoscope_dev_password}@localhost:27017/teleoscope?directConnection=true&serverSelectionTimeoutMS=5000&authSource=admin"
MILVUS_PORT=$(docker compose port milvus 19530 2>/dev/null | cut -d: -f2)
export MILVUS_URI="http://localhost:${MILVUS_PORT:-19530}"
info "MONGODB_URI and MILVUS_URI set for host"

seed_out=""
if command -v mamba &>/dev/null && mamba run -n teleoscope true 2>/dev/null; then
  info "Running seed via mamba run -n teleoscope..."
  seed_out=$(MONGODB_URI="$MONGODB_URI" MILVUS_URI="$MILVUS_URI" mamba run -n teleoscope bash -c "cd '$REPO_ROOT' && PYTHONPATH=. python scripts/seed-demo-corpus.py" 2>/dev/null) || true
fi
if [[ -z "$seed_out" ]] && command -v micromamba &>/dev/null && micromamba run -n teleoscope true 2>/dev/null; then
  info "Running seed via micromamba run -n teleoscope..."
  seed_out=$(MONGODB_URI="$MONGODB_URI" MILVUS_URI="$MILVUS_URI" micromamba run -n teleoscope bash -c "cd '$REPO_ROOT' && PYTHONPATH=. python scripts/seed-demo-corpus.py" 2>/dev/null) || true
fi
if [[ -z "$seed_out" ]]; then
  info "Running seed with current Python..."
  seed_out=$(cd "$REPO_ROOT" && PYTHONPATH=. python scripts/seed-demo-corpus.py 2>/dev/null) || true
fi

if [[ -z "$seed_out" ]]; then
  fail "Could not seed demo corpus. Install the env and deps, then run: mamba activate teleoscope; PYTHONPATH=. python scripts/seed-demo-corpus.py; add DEMO_CORPUS_WORKSPACE_ID=<printed_id> to .env and restart app."
fi
ok "Seed script finished"

DEMO_WORKSPACE_ID=$(echo "$seed_out" | grep 'DEMO_CORPUS_WORKSPACE_ID=' | tail -1 | sed 's/.*DEMO_CORPUS_WORKSPACE_ID=//' | tr -d '\r')
if [[ -z "$DEMO_WORKSPACE_ID" ]] && [[ -f "$REPO_ROOT/.demo_corpus_workspace_id" ]]; then
  DEMO_WORKSPACE_ID=$(cat "$REPO_ROOT/.demo_corpus_workspace_id" | tr -d '\r\n')
  info "Read DEMO_CORPUS_WORKSPACE_ID from .demo_corpus_workspace_id"
fi
if [[ -z "$DEMO_WORKSPACE_ID" ]]; then
  fail "Could not parse DEMO_CORPUS_WORKSPACE_ID from seed script output or .demo_corpus_workspace_id file."
fi
ok "Workspace ID: $DEMO_WORKSPACE_ID"

info "Updating .env with DEMO_CORPUS_WORKSPACE_ID..."
if grep -q '^DEMO_CORPUS_WORKSPACE_ID=' .env 2>/dev/null; then
  if [[ "$(uname)" = Darwin ]]; then
    sed -i '' "s|^DEMO_CORPUS_WORKSPACE_ID=.*|DEMO_CORPUS_WORKSPACE_ID=$DEMO_WORKSPACE_ID|" .env
  else
    sed -i "s|^DEMO_CORPUS_WORKSPACE_ID=.*|DEMO_CORPUS_WORKSPACE_ID=$DEMO_WORKSPACE_ID|" .env
  fi
  ok "Updated existing DEMO_CORPUS_WORKSPACE_ID in .env"
else
  echo "DEMO_CORPUS_WORKSPACE_ID=$DEMO_WORKSPACE_ID" >> .env
  ok "Appended DEMO_CORPUS_WORKSPACE_ID to .env"
fi

section "Restart app to load corpus"
info "Recreating app container so it reads new .env..."
docker compose up -d --force-recreate app
ok "App container recreated"
sleep 5
info "Waiting for App API after restart..."
wait_for_cmd "App API (after restart)" "curl -sf --connect-timeout 2 http://localhost:3000/api/hello | rg -q hello" 60

section "Demo checks"
info "Checking public demo API..."
curl -sf "http://localhost:3000/api/demo/posts?limit=5" >/tmp/teleoscope_demo_api.json && ok "Demo API responded" || warn "Demo API check failed"
info "Checking public demo page..."
curl -sf "http://localhost:3000/demo" >/tmp/teleoscope_demo_page.html && ok "Demo page responded" || warn "Demo page check failed"
info "Running demo load smoke test (100 concurrent, 10s)..."
node scripts/load-test-demo.mjs http://localhost:3000 100 10 && ok "Load test passed" || warn "Load test had issues"

echo ""
echo -e "${GREEN}=== Demo ready ===${NC}"
echo "  Open: http://localhost:3000/demo"
echo ""
