#!/usr/bin/env bash
# Demo status monitor: verify demo corpus, Mongo, app, and optional Milvus.
# Usage: ./scripts/demo-status.sh [base_url]
# Set MONGODB_URI in .env or env for Mongo checks; base_url defaults to http://localhost:3000.
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
BASE_URL="${1:-http://localhost:3000}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ok()   { echo -e "${GREEN}  ✓${NC} $1"; }
warn() { echo -e "${YELLOW}  ⚠${NC} $1"; }
fail() { echo -e "${RED}  ✗${NC} $1"; }
section() { echo -e "\n${CYAN}▶ $1${NC}"; }

echo -e "${CYAN}=== Demo status ($BASE_URL) ===${NC}"

# --- .env and DEMO_CORPUS_WORKSPACE_ID ---
section "Demo workspace ID"
if [[ -f .env ]]; then
  if grep -q '^DEMO_CORPUS_WORKSPACE_ID=' .env 2>/dev/null; then
    DEMO_WORKSPACE_ID=$(grep '^DEMO_CORPUS_WORKSPACE_ID=' .env | head -1 | sed 's/^DEMO_CORPUS_WORKSPACE_ID=//' | tr -d '\r')
    ok "DEMO_CORPUS_WORKSPACE_ID is set in .env ($DEMO_WORKSPACE_ID)"
  else
    warn "DEMO_CORPUS_WORKSPACE_ID not set in .env (demo will show empty corpus)"
  fi
else
  warn ".env not found"
  DEMO_WORKSPACE_ID=""
fi
if [[ -z "$DEMO_WORKSPACE_ID" ]] && [[ -f .demo_corpus_workspace_id ]]; then
  DEMO_WORKSPACE_ID=$(cat .demo_corpus_workspace_id | tr -d '\r\n')
  warn "Using .demo_corpus_workspace_id file ($DEMO_WORKSPACE_ID); add to .env and restart app"
fi

# --- Demo data files ---
section "Demo data (pre-vectorized)"
if [[ -f data/documents.jsonl.7z ]]; then
  ok "data/documents.jsonl.7z present"
elif [[ -f data/documents.jsonl ]]; then
  ok "data/documents.jsonl present"
else
  fail "No data/documents.jsonl.7z or data/documents.jsonl (run ./scripts/download-demo-data.sh)"
fi
PARQUET_COUNT=$(find data/parquet_export -name 'part-*.parquet' 2>/dev/null | wc -l | tr -d ' ')
if [[ "${PARQUET_COUNT:-0}" -gt 0 ]]; then
  ok "data/parquet_export: $PARQUET_COUNT part file(s)"
else
  warn "No data/parquet_export/part-*.parquet (ranking will be unavailable)"
fi

# --- MongoDB ---
section "MongoDB (demo corpus documents)"
set -a
# shellcheck source=/dev/null
source .env 2>/dev/null || true
set +a
MONGODB_URI="${MONGODB_URI:-mongodb://teleoscope:teleoscope_dev_password@localhost:27017/teleoscope?directConnection=true&serverSelectionTimeoutMS=5000&authSource=admin}"
MONGODB_DATABASE="${MONGODB_DATABASE:-teleoscope}"

if [[ -n "$DEMO_WORKSPACE_ID" ]]; then
  export DEMO_WORKSPACE_ID
  # Use Python to count documents and check text index (pymongo is in backend deps)
  MONGO_STATUS=$(PYTHONPATH=. python3 -c "
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path('.').resolve()))
try:
    from pymongo import MongoClient
    from bson.objectid import ObjectId
except ImportError:
    print('SKIP:pymongo not available')
    sys.exit(0)
uri = os.environ.get('MONGODB_URI', '')
dbname = os.environ.get('MONGODB_DATABASE', 'teleoscope')
wid = os.environ.get('DEMO_WORKSPACE_ID', '')
if not wid:
    print('SKIP:no workspace id')
    sys.exit(0)
try:
    client = MongoClient(uri, serverSelectionTimeoutMS=3000)
    db = client[dbname]
    oid = ObjectId(wid)
    count = db.documents.count_documents({'workspace': oid})
    indexes = list(db.documents.index_information().keys())
    has_text = 'text' in indexes
    print(f'{count}:{\"yes\" if has_text else \"no\"}')
except Exception as e:
    print(f'ERR:{e}')
" 2>/dev/null) || MONGO_STATUS=""
  if [[ -z "$MONGO_STATUS" ]]; then
    warn "Could not connect to Mongo or pymongo not installed"
  elif [[ "$MONGO_STATUS" == SKIP:* ]]; then
    warn "${MONGO_STATUS#SKIP:}"
  elif [[ "$MONGO_STATUS" == ERR:* ]]; then
    fail "Mongo: ${MONGO_STATUS#ERR:}"
  else
    DOC_COUNT="${MONGO_STATUS%%:*}"
    HAS_TEXT="${MONGO_STATUS#*:}"
    if [[ "$DOC_COUNT" =~ ^[0-9]+$ ]]; then
      ok "Documents in demo workspace: $DOC_COUNT"
      if [[ "$HAS_TEXT" == "yes" ]]; then
        ok "Text index exists (search/count will work)"
      else
        warn "Text index missing (run ./scripts/refresh-demo-corpus.sh to fix)"
      fi
    else
      fail "Mongo: $MONGO_STATUS"
    fi
  fi
else
  warn "No DEMO_CORPUS_WORKSPACE_ID; skip Mongo doc count"
fi

# --- App ---
section "App"
if curl -sf --connect-timeout 3 "$BASE_URL/api/hello" 2>/dev/null | grep -q '"hello"'; then
  ok "App responding at $BASE_URL"
else
  fail "App not responding at $BASE_URL"
fi

# --- Docker (optional) ---
section "Docker services"
if command -v docker >/dev/null 2>&1 && [[ -f docker-compose.yml ]]; then
  if docker compose ps --format json 2>/dev/null | grep -q '"Name"'; then
    docker compose ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null | head -20 || true
  else
    warn "docker compose ps failed or no services"
  fi
else
  warn "Docker not available or no docker-compose.yml"
fi

echo ""
echo -e "${CYAN}Demo URL: $BASE_URL/demo${NC}"
echo ""
