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

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "Created .env from .env.example"
  else
    echo "Missing .env and .env.example"
    exit 1
  fi
fi
# Load .env for MONGODB_PASSWORD etc. when seeding from host
set -a
# shellcheck source=/dev/null
source .env 2>/dev/null || true
set +a

if [[ -n "${CLEAN_INSTALL:-}" ]]; then
  echo "CLEAN_INSTALL=1: full rebuild (no cache) and re-download demo data..."
  docker compose build --no-cache
  docker compose up -d
else
  echo "Starting Teleoscope stack for public demo (using cache; run CLEAN_INSTALL=1 for full rebuild)..."
  docker compose up -d --build
fi

wait_for_cmd() {
  local name="$1"
  local cmd="$2"
  local max="${3:-90}"
  local n=0
  while ! eval "$cmd" 2>/dev/null; do
    n=$((n + 1))
    if [[ $n -ge $max ]]; then
      echo "Timeout waiting for $name"
      return 1
    fi
    sleep 2
  done
  echo "  $name ready"
}

echo "Waiting for base services..."
wait_for_cmd "App API" "curl -sf --connect-timeout 2 http://localhost:3000/api/hello | rg -q hello" 120
wait_for_cmd "Stack connectivity" "./scripts/test-stack.sh http://localhost:3000 >/tmp/teleoscope_demo_stack_check.log" 60

echo "Downloading and seeding demo corpus (required for /demo)..."
echo "  (Demo uses pre-vectorized data from parquet_export/; the vectorization pipeline is not run.)"
if [[ -n "${CLEAN_INSTALL:-}" ]]; then
  ./scripts/download-demo-data.sh
elif [[ ! -f data/documents.jsonl.7z ]] && [[ ! -f data/documents.jsonl ]]; then
  ./scripts/download-demo-data.sh
else
  echo "  Demo data already present in data/ (skip download)"
fi

# Seed from host: need Mongo/Milvus reachable on localhost
export MONGODB_URI="mongodb://teleoscope:${MONGODB_PASSWORD:-teleoscope_dev_password}@localhost:27017/teleoscope?directConnection=true&serverSelectionTimeoutMS=5000&authSource=admin"
MILVUS_PORT=$(docker compose port milvus 19530 2>/dev/null | cut -d: -f2)
export MILVUS_URI="http://localhost:${MILVUS_PORT:-19530}"

seed_out=""
if command -v mamba &>/dev/null && mamba run -n teleoscope true 2>/dev/null; then
  seed_out=$(MONGODB_URI="$MONGODB_URI" MILVUS_URI="$MILVUS_URI" mamba run -n teleoscope bash -c "cd '$REPO_ROOT' && PYTHONPATH=. python scripts/seed-demo-corpus.py" 2>/dev/null) || true
fi
if [[ -z "$seed_out" ]] && command -v micromamba &>/dev/null && micromamba run -n teleoscope true 2>/dev/null; then
  seed_out=$(MONGODB_URI="$MONGODB_URI" MILVUS_URI="$MILVUS_URI" micromamba run -n teleoscope bash -c "cd '$REPO_ROOT' && PYTHONPATH=. python scripts/seed-demo-corpus.py" 2>/dev/null) || true
fi
if [[ -z "$seed_out" ]]; then
  seed_out=$(cd "$REPO_ROOT" && PYTHONPATH=. python scripts/seed-demo-corpus.py 2>/dev/null) || true
fi

if [[ -z "$seed_out" ]]; then
  echo "ERROR: Could not seed demo corpus. Install the env and deps, then run:"
  echo "  mamba activate teleoscope   # or: micromamba activate teleoscope"
  echo "  PYTHONPATH=. python scripts/seed-demo-corpus.py"
  echo "Then add DEMO_CORPUS_WORKSPACE_ID=<printed_id> to .env and restart: docker compose up -d app"
  exit 1
fi

DEMO_WORKSPACE_ID=$(echo "$seed_out" | grep 'DEMO_CORPUS_WORKSPACE_ID=' | tail -1 | sed 's/.*DEMO_CORPUS_WORKSPACE_ID=//' | tr -d '\r')
if [[ -z "$DEMO_WORKSPACE_ID" ]] && [[ -f "$REPO_ROOT/.demo_corpus_workspace_id" ]]; then
  DEMO_WORKSPACE_ID=$(cat "$REPO_ROOT/.demo_corpus_workspace_id" | tr -d '\r\n')
fi
if [[ -z "$DEMO_WORKSPACE_ID" ]]; then
  echo "ERROR: Could not parse DEMO_CORPUS_WORKSPACE_ID from seed script output or .demo_corpus_workspace_id file."
  exit 1
fi

if grep -q '^DEMO_CORPUS_WORKSPACE_ID=' .env 2>/dev/null; then
  if [[ "$(uname)" = Darwin ]]; then
    sed -i '' "s|^DEMO_CORPUS_WORKSPACE_ID=.*|DEMO_CORPUS_WORKSPACE_ID=$DEMO_WORKSPACE_ID|" .env
  else
    sed -i "s|^DEMO_CORPUS_WORKSPACE_ID=.*|DEMO_CORPUS_WORKSPACE_ID=$DEMO_WORKSPACE_ID|" .env
  fi
else
  echo "DEMO_CORPUS_WORKSPACE_ID=$DEMO_WORKSPACE_ID" >> .env
fi
echo "  Set DEMO_CORPUS_WORKSPACE_ID=$DEMO_WORKSPACE_ID in .env"

echo "Restarting app to load demo corpus..."
docker compose up -d --force-recreate app
sleep 5
wait_for_cmd "App API (after restart)" "curl -sf --connect-timeout 2 http://localhost:3000/api/hello | rg -q hello" 60

echo "Checking public demo API..."
curl -sf "http://localhost:3000/api/demo/posts?limit=5" >/tmp/teleoscope_demo_api.json

echo "Checking public demo page..."
curl -sf "http://localhost:3000/demo" >/tmp/teleoscope_demo_page.html

echo "Running demo load smoke test..."
node scripts/load-test-demo.mjs http://localhost:3000 100 10

echo "Demo environment is ready (with pre-seeded corpus)."
echo "Open: http://localhost:3000/demo"
