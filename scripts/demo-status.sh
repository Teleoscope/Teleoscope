#!/usr/bin/env bash
# Demo status monitor: verify demo corpus, Mongo, app, and optional Milvus.
# For raw Milvus collections/partitions/row counts (any workspace): PYTHONPATH=. python scripts/milvus-status.py
# Usage: ./scripts/demo-status.sh [-v|--verbose] [base_url]
# Set MONGODB_URI in .env or env for Mongo checks; base_url defaults to http://localhost:3000.
# Honors TELEOSCOPE_DATA_DIR (same as seed-demo-corpus.py); defaults to <repo>/data.
# Verbose: -v / --verbose or DEMO_STATUS_VERBOSE=1 (extra paths, sizes, config, timings).
# DEMO_STATUS_SKIP_APP=1: skip HTTP /api/hello (e.g. refresh-demo-corpus.sh before app recreate).
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

CLI_VERBOSE=0
POSITIONAL=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    -v|--verbose)
      CLI_VERBOSE=1
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [-v|--verbose] [base_url]"
      echo "  base_url defaults to http://localhost:3000"
      echo "  DEMO_STATUS_VERBOSE=1 enables verbose (same as -v)"
      exit 0
      ;;
    *)
      POSITIONAL+=("$1")
      shift
      ;;
  esac
done

set -a
# shellcheck source=/dev/null
source .env 2>/dev/null || true
set +a

VERBOSE=0
[[ "$CLI_VERBOSE" -eq 1 ]] && VERBOSE=1
[[ "$CLI_VERBOSE" -eq 0 ]] && case "${DEMO_STATUS_VERBOSE,,}" in 1|true|yes) VERBOSE=1 ;; esac

BASE_URL="${POSITIONAL[0]:-http://localhost:3000}"
DATA_DIR="${TELEOSCOPE_DATA_DIR:-$REPO_ROOT/data}"
if [[ "$DATA_DIR" != /* ]]; then
  DATA_DIR="$REPO_ROOT/$DATA_DIR"
fi

SECONDS=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
NC='\033[0m'

ok()   { echo -e "${GREEN}  [OK]${NC} $*"; }
warn() { echo -e "${YELLOW}  [WARN]${NC} $*"; }
info() { echo -e "${CYAN}  [INFO]${NC} $*"; }
fail() { echo -e "${RED}  [FAIL]${NC} $*"; }
section() { echo -e "\n${CYAN}=== $* ===${NC}"; }
vinfo() {
  [[ "$VERBOSE" -eq 1 ]] || return 0
  echo -e "${DIM}  [verbose]${NC} $*"
}

# Redact user:pass@ in mongodb URIs for logs
_redact_mongo_uri() {
  echo "${1:-}" | sed -E 's#(mongodb(\+srv)?://)[^/@]+@#\1***@#'
}

echo -e "${CYAN}=== Demo status ($BASE_URL) ===${NC}"
vinfo "REPO_ROOT=$REPO_ROOT"
vinfo "Verbose mode on (DEMO_STATUS_VERBOSE / -v)"

# --- .env and DEMO_CORPUS_WORKSPACE_ID ---
section "Demo workspace ID"
vinfo ".env path: $REPO_ROOT/.env ($( [[ -f .env ]] && echo present || echo missing ))"
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
info "Data directory: $DATA_DIR"
if [[ -f "$DATA_DIR/documents.jsonl.7z" ]]; then
  ok "documents.jsonl.7z present"
  [[ "$VERBOSE" -eq 1 ]] && vinfo "$(ls -lh "$DATA_DIR/documents.jsonl.7z" 2>/dev/null | awk '{print $5" "$6" "$7" "$9}')"
elif [[ -f "$DATA_DIR/documents.jsonl" ]]; then
  ok "documents.jsonl present"
  [[ "$VERBOSE" -eq 1 ]] && vinfo "$(ls -lh "$DATA_DIR/documents.jsonl" 2>/dev/null | awk '{print $5" "$6" "$7" "$9}')"
else
  fail "No documents.jsonl.7z or documents.jsonl under $DATA_DIR (run ./scripts/download-demo-data.sh or PYTHONPATH=. python scripts/seed-demo-corpus.py to fetch)"
fi
# Same search order as seed-demo-corpus.py: parquet_export/full, then parquet_export
PARQUET_DIR=""
PARQUET_COUNT=0
for _pqdir in "$DATA_DIR/parquet_export/full" "$DATA_DIR/parquet_export"; do
  if [[ -d "$_pqdir" ]]; then
    _n=$(find "$_pqdir" -maxdepth 1 -name 'part-*.parquet' 2>/dev/null | wc -l | tr -d ' ')
    vinfo "Checked $_pqdir: part-*.parquet count=$_n"
    if [[ "${_n:-0}" -gt 0 ]]; then
      PARQUET_DIR="$_pqdir"
      PARQUET_COUNT="$_n"
      break
    fi
  else
    vinfo "Parquet candidate not a directory: $_pqdir"
  fi
done
WANTS_MILVUS=0
if [[ -n "${MILVUS_URI:-}" ]] || [[ -n "${MILVUS_LITE_PATH:-}" ]]; then
  WANTS_MILVUS=1
fi
vinfo "Milvus env: WANTS_MILVUS=$WANTS_MILVUS (MILVUS_URI ${MILVUS_URI:+set}${MILVUS_URI:-unset}, MILVUS_LITE_PATH ${MILVUS_LITE_PATH:+set}${MILVUS_LITE_PATH:-unset})"
if [[ "${PARQUET_COUNT:-0}" -gt 0 ]]; then
  ok "parquet vectors: $PARQUET_COUNT part file(s) in $PARQUET_DIR"
  if [[ "$VERBOSE" -eq 1 ]]; then
    vinfo "$( (du -sh "$PARQUET_DIR" 2>/dev/null || true) )"
    vinfo "Sample files: $(find "$PARQUET_DIR" -maxdepth 1 -name 'part-*.parquet' 2>/dev/null | head -5 | tr '\n' ' ')"
  fi
else
  if [[ "$WANTS_MILVUS" -eq 1 ]]; then
    fail "No parquet_export/.../part-*.parquet under $DATA_DIR (required with MILVUS_URI or MILVUS_LITE_PATH; run download-demo-data.sh or seed)"
  else
    warn "No parquet part-*.parquet under $DATA_DIR/parquet_export (optional unless Milvus is configured)"
  fi
fi

# --- MongoDB ---
section "MongoDB (demo corpus documents)"
MONGODB_URI="${MONGODB_URI:-mongodb://teleoscope:teleoscope_dev_password@localhost:27017/teleoscope?directConnection=true&serverSelectionTimeoutMS=5000&authSource=admin}"
MONGODB_DATABASE="${MONGODB_DATABASE:-teleoscope}"
export MONGODB_URI MONGODB_DATABASE
vinfo "MONGODB_DATABASE=$MONGODB_DATABASE"
vinfo "MONGODB_URI=$(_redact_mongo_uri "$MONGODB_URI")"

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
  export _DEMO_STATUS_VERBOSE_PY="$VERBOSE"
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
    line = f'{count}:{\"yes\" if has_text else \"no\"}'
    if os.environ.get('_DEMO_STATUS_VERBOSE_PY') == '1':
        line += '|' + ','.join(sorted(indexes))
    print(line)
except Exception as e:
    print(f'ERR:{e}')
" 2>/dev/null) || MONGO_STATUS=""
  unset _DEMO_STATUS_VERBOSE_PY 2>/dev/null || true
  if [[ -z "$MONGO_STATUS" ]]; then
    warn "Could not connect to Mongo or pymongo not installed"
  elif [[ "$MONGO_STATUS" == SKIP:* ]]; then
    warn "${MONGO_STATUS#SKIP:}"
  elif [[ "$MONGO_STATUS" == ERR:* ]]; then
    fail "Mongo: ${MONGO_STATUS#ERR:}"
  else
    DOC_COUNT="${MONGO_STATUS%%:*}"
    _mongo_rest="${MONGO_STATUS#*:}"
    HAS_TEXT="${_mongo_rest%%|*}"
    if [[ "$_mongo_rest" == *"|"* ]]; then
      vinfo "documents index names: ${_mongo_rest#*|}"
    fi
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
vinfo "MILVUS_COLLECTION=${MILVUS_COLLECTION:-<unset>} MILVUS_DBNAME=${MILVUS_DBNAME:-<unset>}"
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
if [[ "${DEMO_STATUS_SKIP_APP:-0}" == "1" ]]; then
  info "Skipping HTTP app check (DEMO_STATUS_SKIP_APP=1 — e.g. right before \`docker compose recreate app\`)"
else
  if [[ "$VERBOSE" -eq 1 ]]; then
    _hello_ms="$(curl -sf --connect-timeout 3 -o /dev/null -w '%{time_total}' "$BASE_URL/api/hello" 2>/dev/null || echo "")"
    vinfo "GET $BASE_URL/api/hello time_total=${_hello_ms}s"
  fi
  if curl -sf --connect-timeout 3 "$BASE_URL/api/hello" 2>/dev/null | grep -q '"hello"'; then
    ok "App responding at $BASE_URL"
  else
    fail "App not responding at $BASE_URL"
  fi
fi

# --- Docker (optional) ---
section "Docker services"
if command -v docker >/dev/null 2>&1 && [[ -f docker-compose.yml ]]; then
  if docker compose ps --format json 2>/dev/null | grep -q '"Name"'; then
    if [[ "$VERBOSE" -eq 1 ]]; then
      docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true
    else
      docker compose ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null | head -20 || true
    fi
  else
    warn "docker compose ps failed or no services"
  fi
else
  warn "Docker not available or no docker-compose.yml"
fi

echo ""
echo -e "${CYAN}Demo URL: $BASE_URL/demo${NC}"
vinfo "Finished in ${SECONDS}s wall time"
echo ""
