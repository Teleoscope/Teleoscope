#!/usr/bin/env bash
# Demo status monitor: verify demo corpus, Mongo, app, and optional Milvus.
# For raw Milvus collections/partitions/row counts (any workspace): PYTHONPATH=. python scripts/milvus-status.py
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

ok()   { echo -e "${GREEN}  [OK]${NC} $*"; }
warn() { echo -e "${YELLOW}  [WARN]${NC} $*"; }
info() { echo -e "${CYAN}  [INFO]${NC} $*"; }
fail() { echo -e "${RED}  [FAIL]${NC} $*"; }
section() { echo -e "\n${CYAN}=== $* ===${NC}"; }

echo -e "${CYAN}=== Demo status ($BASE_URL) ===${NC}"

# --- .env and DEMO_CORPUS_WORKSPACE_ID ---
section "Demo workspace ID"
if [[ -f .env ]]; then
  if grep -q '^DEMO_CORPUS_WORKSPACE_ID=' .env 2>/dev/null; then
    DEMO_WORKSPACE_ID=$(grep '^DEMO_CORPUS_WORKSPACE_ID=' .env | head -1 | sed 's/^DEMO_CORPUS_WORKSPACE_ID=//' | tr -d '\r')
    ok "DEMO_CORPUS_WORKSPACE_ID is set in .env ($DEMO_WORKSPACE_ID)"
  else
    ok "DEMO_CORPUS_WORKSPACE_ID not set; app will auto-discover demo corpus by label \"Demo corpus\" in Mongo"
  fi
else
  warn ".env not found"
  DEMO_WORKSPACE_ID=""
fi
if [[ -z "$DEMO_WORKSPACE_ID" ]] && [[ -f .demo_corpus_workspace_id ]]; then
  DEMO_WORKSPACE_ID=$(cat .demo_corpus_workspace_id | tr -d '\r\n')
  info "Read from .demo_corpus_workspace_id ($DEMO_WORKSPACE_ID); app can also discover by label"
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
export MONGODB_URI MONGODB_DATABASE

# Resolve demo workspace: use env/file if set, else discover by label "Demo corpus" (same as app)
if [[ -z "$DEMO_WORKSPACE_ID" ]]; then
  DEMO_WORKSPACE_ID=$(PYTHONPATH=. python3 -c "
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path('.').resolve()))
try:
    from pymongo import MongoClient
except ImportError:
    sys.exit(1)
uri = os.environ.get('MONGODB_URI', '')
dbname = os.environ.get('MONGODB_DATABASE', 'teleoscope')
try:
    client = MongoClient(uri, serverSelectionTimeoutMS=3000)
    db = client[dbname]
    w = db.workspaces.find_one({'label': 'Demo corpus'}, {'_id': 1})
    if w and w.get('_id'):
        print(str(w['_id']))
except Exception:
    pass
" 2>/dev/null) || true
  if [[ -n "$DEMO_WORKSPACE_ID" ]]; then
    info "Demo workspace discovered by label \"Demo corpus\": $DEMO_WORKSPACE_ID"
  fi
fi

if [[ -n "$DEMO_WORKSPACE_ID" ]]; then
  export DEMO_WORKSPACE_ID
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
  warn "No demo workspace ID (env/file) and could not discover by label \"Demo corpus\"; is Mongo up and corpus seeded?"
fi

# --- Milvus ---
section "Milvus (vector ranking)"
set -a
# shellcheck source=/dev/null
source .env 2>/dev/null || true
set +a
MILVUS_PORT="${MILVUS_PORT:-}"
if [[ -n "${MILVUS_URI:-}" ]]; then
  if [[ "$MILVUS_URI" =~ ^https?://[^:/]+:([0-9]+) ]]; then
    MILVUS_PORT="${BASH_REMATCH[1]}"
  elif [[ "$MILVUS_URI" =~ ^https?://[^:/]+ ]]; then
    MILVUS_PORT="19530"
  fi
fi
if [[ -z "$MILVUS_PORT" ]] && command -v docker >/dev/null 2>&1 && [[ -f docker-compose.yml ]]; then
  MILVUS_PORT=$(docker compose port milvus 19530 2>/dev/null | cut -d: -f2)
fi
if [[ -z "$MILVUS_PORT" ]]; then
  MILVUS_PORT="19530"
fi
# Export for Python backend.embeddings (URI takes precedence over HOST:PORT)
export MILVUS_URI="${MILVUS_URI:-http://localhost:$MILVUS_PORT}"
export MILVUS_DBNAME="${MILVUS_DBNAME:-teleoscope}"

if [[ -n "${MILVUS_LITE_PATH:-}" ]]; then
  LITE_PATH="${MILVUS_LITE_PATH}"
  [[ "$LITE_PATH" != /* ]] && LITE_PATH="$REPO_ROOT/$LITE_PATH"
  if [[ -e "$LITE_PATH" ]]; then
    ok "Milvus Lite path present: $LITE_PATH"
  else
    warn "MILVUS_LITE_PATH set but path not found: $LITE_PATH"
  fi
  # Optional: demo partition check + vector count via Python (same as server path below)
  if [[ -n "$DEMO_WORKSPACE_ID" ]]; then
    MILVUS_STATUS=$(MILVUS_LITE_PATH="$MILVUS_LITE_PATH" DEMO_WORKSPACE_ID="$DEMO_WORKSPACE_ID" PYTHONPATH=. python3 -c "
import os, sys
from pathlib import Path
sys.path.insert(0, str(Path('.').resolve()))
try:
    from backend import embeddings
    client = embeddings.connect()
    cn = os.environ.get('MILVUS_COLLECTION') or os.environ.get('MILVUS_DBNAME', 'teleoscope')
    wid = os.environ.get('DEMO_WORKSPACE_ID', '')
    if not client.has_partition(collection_name=cn, partition_name=wid):
        print('PARTITION:no')
    else:
        try:
            st = client.get_partition_stats(collection_name=cn, partition_name=wid)
            n = int(st.get('row_count', 0))
            print('PARTITION:yes:' + str(n))
        except Exception:
            print('PARTITION:yes')
except Exception as e:
    print('ERR:' + str(e))
" 2>/dev/null) || true
    if [[ "$MILVUS_STATUS" == PARTITION:yes:* ]]; then
      MILVUS_VECTORS="${MILVUS_STATUS#PARTITION:yes:}"
      ok "Demo partition: $MILVUS_VECTORS vectors (ranking available)"
    elif [[ "$MILVUS_STATUS" == "PARTITION:yes" ]]; then
      ok "Demo partition exists (ranking available)"
    elif [[ "$MILVUS_STATUS" == "PARTITION:no" ]]; then
      warn "Demo partition missing (run seed with MILVUS_LITE_PATH for ranking)"
    fi
  fi
else
  if command -v nc >/dev/null 2>&1 && nc -z localhost "$MILVUS_PORT" 2>/dev/null; then
    ok "Milvus reachable at localhost:$MILVUS_PORT"
  elif command -v timeout >/dev/null 2>&1 && timeout 1 bash -c "cat < /dev/null > /dev/tcp/localhost/$MILVUS_PORT" 2>/dev/null; then
    ok "Milvus reachable at localhost:$MILVUS_PORT"
  else
    warn "Milvus not reachable at localhost:$MILVUS_PORT (ranking will be unavailable)"
  fi
  if [[ -n "$DEMO_WORKSPACE_ID" ]]; then
    export MILVUS_URI="${MILVUS_URI:-http://localhost:$MILVUS_PORT}"
    export DEMO_WORKSPACE_ID
    MILVUS_STATUS=$(PYTHONPATH=. python3 -c "
import os, sys
from pathlib import Path
sys.path.insert(0, str(Path('.').resolve()))
try:
    from backend import embeddings
    client = embeddings.connect()
    cn = os.environ.get('MILVUS_COLLECTION') or os.environ.get('MILVUS_DBNAME', 'teleoscope')
    wid = os.environ.get('DEMO_WORKSPACE_ID', '')
    if not client.has_partition(collection_name=cn, partition_name=wid):
        print('PARTITION:no')
    else:
        try:
            st = client.get_partition_stats(collection_name=cn, partition_name=wid)
            n = int(st.get('row_count', 0))
            print('PARTITION:yes:' + str(n))
        except Exception:
            print('PARTITION:yes')
except Exception as e:
    print('ERR:' + str(e))
" 2>/dev/null) || true
    if [[ "$MILVUS_STATUS" == PARTITION:yes:* ]]; then
      MILVUS_VECTORS="${MILVUS_STATUS#PARTITION:yes:}"
      ok "Demo partition: $MILVUS_VECTORS vectors (ranking available)"
    elif [[ "$MILVUS_STATUS" == "PARTITION:yes" ]]; then
      ok "Demo partition exists (ranking available)"
    elif [[ "$MILVUS_STATUS" == "PARTITION:no" ]]; then
      warn "Demo partition missing (run seed with MILVUS_URI for ranking)"
    elif [[ "$MILVUS_STATUS" == ERR:* ]]; then
      info "Could not check demo partition: ${MILVUS_STATUS#ERR:}"
    fi
  fi
fi

# --- Counts summary ---
section "Counts (Mongo docs vs Milvus vectors)"
if [[ -n "${DOC_COUNT:-}" ]] && [[ "$DOC_COUNT" =~ ^[0-9]+$ ]]; then
  info "Mongo demo documents: $DOC_COUNT"
fi
if [[ -n "${MILVUS_VECTORS:-}" ]] && [[ "$MILVUS_VECTORS" =~ ^[0-9]+$ ]]; then
  info "Milvus demo vectors: $MILVUS_VECTORS"
fi
if [[ -n "${DOC_COUNT:-}" ]] && [[ "$DOC_COUNT" =~ ^[0-9]+$ ]] && [[ -n "${MILVUS_VECTORS:-}" ]] && [[ "$MILVUS_VECTORS" =~ ^[0-9]+$ ]]; then
  if [[ "$DOC_COUNT" -eq "$MILVUS_VECTORS" ]]; then
    ok "Counts match ($DOC_COUNT docs = $MILVUS_VECTORS vectors)"
  else
    warn "Mismatch: Mongo $DOC_COUNT docs vs Milvus $MILVUS_VECTORS vectors (run ./scripts/refresh-demo-corpus.sh to re-seed)"
  fi
elif [[ -z "${DOC_COUNT:-}" ]] && [[ -z "${MILVUS_VECTORS:-}" ]]; then
  info "No counts available (ensure demo workspace and Mongo/Milvus are reachable)"
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
