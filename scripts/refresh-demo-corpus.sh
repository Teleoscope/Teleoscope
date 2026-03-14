#!/usr/bin/env bash
# Update-only (no packages, no data download): re-seed the demo corpus from existing data and restart the app.
# Does not: rebuild Docker images, run npm/pip install, or download demo data. Use when data/ already
# has documents.jsonl.7z and parquet_export/. For code updates, run 'git pull' first.
# Full bootstrap: ./scripts/one-click-demo.sh. Clean install (rebuild + re-download): CLEAN_INSTALL=1 ./scripts/one-click-demo.sh
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env. Run ./scripts/one-click-demo.sh first or copy .env.example to .env."
  exit 1
fi

if [[ ! -f data/documents.jsonl.7z ]] && [[ ! -f data/documents.jsonl ]]; then
  echo "No demo data in data/. Run ./scripts/download-demo-data.sh first (or ./scripts/one-click-demo.sh for full setup)."
  exit 1
fi

set -a
# shellcheck source=/dev/null
source .env 2>/dev/null || true
set +a

echo "Re-seeding demo corpus from existing data (no download; pre-vectorized parquet only, no vectorization pipeline)."

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
  echo "ERROR: Could not seed. Ensure mamba env teleoscope is available (mamba activate teleoscope) and Mongo (and Milvus if desired) are reachable."
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

echo "Demo corpus refreshed. App is restarting; open http://localhost:3000/demo when ready."
