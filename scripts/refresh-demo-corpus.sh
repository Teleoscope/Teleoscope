#!/usr/bin/env bash
# Update-only (no packages, no data download): re-seed the demo corpus from existing data and restart the app.
# Does not: rebuild Docker images, run npm/pip install, or download demo data. Use when data/ already
# has documents.jsonl.7z and parquet_export/. For code updates, run 'git pull' first.
# MILVUS_ONLY=1: only reload vectors into Milvus (Mongo unchanged); needs parquet + matching Mongo doc count.
# Full bootstrap: ./scripts/one-click-demo.sh. Clean install (rebuild + re-download): CLEAN_INSTALL=1 ./scripts/one-click-demo.sh
#
# The seed runs in the foreground (stdout/stderr visible). mamba/micromamba/PATH are tried only when
# the prior runner is unavailable — a failed seed (non-zero exit) does NOT fall through to another runner
# (that used to re-run the full Mongo re-seed twice). If it finishes suspiciously fast, check the log
# for "Milvus seed done" / upsert batches, or run after refresh:
#   DEMO_STATUS_SKIP_APP=1 ./scripts/demo-status.sh -v
#   PYTHONPATH=. python scripts/milvus-status.py --workspace "$(cat .demo_corpus_workspace_id)"
# VERIFY_REFRESH=0 skips the post-seed demo-status run. REFRESH_VERBOSE=1 passes -v to demo-status.
# REFRESH_DEMO_STATUS_URL overrides the base_url passed to demo-status (default http://localhost:3000).
# REFRESH_SKIP_MILVUS_TCP_CHECK=1: skip the localhost Milvus port probe before seed (only if you know the endpoint is special).
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

# shellcheck source=scripts/milvus_docker_uri.sh
source "$REPO_ROOT/scripts/milvus_docker_uri.sh"

refresh_resolve_milvus_uri() {
  milvus_export_host_uri_from_compose
  export MILVUS_URI
}

# True if something accepts TCP on host:port (2s deadline).
_milvus_tcp_open() {
  python3 -c "
import socket, sys
host, port = sys.argv[1], int(sys.argv[2])
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(2.0)
try:
    s.connect((host, port))
    sys.exit(0)
except OSError:
    sys.exit(1)
finally:
    try:
        s.close()
    except Exception:
        pass
" "$1" "$2" 2>/dev/null
}

refresh_check_local_milvus_port() {
  [[ "${REFRESH_SKIP_MILVUS_TCP_CHECK:-0}" == "1" ]] && {
    warn "REFRESH_SKIP_MILVUS_TCP_CHECK=1 — skipping localhost Milvus TCP check"
    return 0
  }
  local uri="$MILVUS_URI"
  if [[ "$uri" =~ ^https?://(localhost|127\.0\.0\.1):([0-9]+) ]]; then
    local port="${BASH_REMATCH[2]}"
    if ! _milvus_tcp_open localhost "$port"; then
      echo -e "${RED}  [FAIL]${NC} Nothing accepting connections on localhost:${port} (Milvus not reachable)."
      echo -e "${YELLOW}  [HINT]${NC} Start Milvus: cd \"$REPO_ROOT\" && docker compose up -d milvus"
      echo -e "${YELLOW}  [HINT]${NC} Mapped port: docker compose port milvus 19530"
      if command -v docker >/dev/null 2>&1; then
        echo -e "${CYAN}  [INFO]${NC} docker compose ps milvus:"
        (cd "$REPO_ROOT" && docker compose ps milvus 2>/dev/null) || true
      fi
      exit 1
    fi
    ok "Milvus listening on localhost:${port}"
  else
    info "MILVUS_URI is not localhost (remote/Zilliz); skipping local TCP preflight"
  fi
}

refresh_resolve_milvus_uri
info "Milvus upserts use MILVUS_URI=$MILVUS_URI (scripts/milvus_docker_uri.sh). Watch seed output for upsert batches or 'skipping Milvus'."
info "Local Milvus TCP is checked immediately before seed (avoids a long Mongo+parquet run when Milvus is down)."

export MONGODB_URI MILVUS_URI

# Only fall back mamba → micromamba → PATH when a *runner is missing*, not when seed exits
# non-zero. Otherwise a Milvus (or any) failure would re-run the full Mongo drop+insert twice.
SEED_RAN=0
SEED_INVOKED=0

if command -v mamba &>/dev/null && mamba run -n teleoscope true 2>/dev/null; then
  section "Seed (streaming — look for Milvus upsert batches + \"Milvus seed done\")"
  if [[ ${#SEED_EXTRA[@]} -eq 0 ]]; then info "Mode: full seed (Mongo + Milvus if reachable)"; else info "Mode: ${SEED_EXTRA[*]}"; fi
  SEED_INVOKED=1
  refresh_resolve_milvus_uri
  info "MILVUS_URI before seed (re-resolved): $MILVUS_URI"
  refresh_check_local_milvus_port
  if mamba run -n teleoscope env PYTHONPATH=. MONGODB_URI="$MONGODB_URI" MILVUS_URI="$MILVUS_URI" python scripts/seed-demo-corpus.py "${SEED_EXTRA[@]}"; then
    SEED_RAN=1
  else
    fail "Seed failed under mamba (exit non-zero). Not retrying with micromamba — that would repeat the full Mongo re-seed. Fix the error above (e.g. Milvus flush) or run: PYTHONPATH=. python scripts/seed-demo-corpus.py"
  fi
fi
if [[ "$SEED_RAN" -eq 0 ]] && [[ "$SEED_INVOKED" -eq 0 ]] && command -v micromamba &>/dev/null && micromamba run -n teleoscope true 2>/dev/null; then
  section "Seed (streaming — micromamba)"
  if [[ ${#SEED_EXTRA[@]} -eq 0 ]]; then info "Mode: full seed (Mongo + Milvus if reachable)"; else info "Mode: ${SEED_EXTRA[*]}"; fi
  SEED_INVOKED=1
  refresh_resolve_milvus_uri
  info "MILVUS_URI before seed (re-resolved): $MILVUS_URI"
  refresh_check_local_milvus_port
  if micromamba run -n teleoscope env PYTHONPATH=. MONGODB_URI="$MONGODB_URI" MILVUS_URI="$MILVUS_URI" python scripts/seed-demo-corpus.py "${SEED_EXTRA[@]}"; then
    SEED_RAN=1
  else
    fail "Seed failed under micromamba (exit non-zero). Not retrying with system Python — that would repeat the full Mongo re-seed. Fix the error above or run seed manually."
  fi
fi
if [[ "$SEED_RAN" -eq 0 ]] && [[ "$SEED_INVOKED" -eq 0 ]]; then
  section "Seed (streaming — current interpreter)"
  if [[ ${#SEED_EXTRA[@]} -eq 0 ]]; then info "Mode: full seed (Mongo + Milvus if reachable)"; else info "Mode: ${SEED_EXTRA[*]}"; fi
  SEED_INVOKED=1
  refresh_resolve_milvus_uri
  info "MILVUS_URI before seed (re-resolved): $MILVUS_URI"
  refresh_check_local_milvus_port
  if env PYTHONPATH=. MONGODB_URI="$MONGODB_URI" MILVUS_URI="$MILVUS_URI" python scripts/seed-demo-corpus.py "${SEED_EXTRA[@]}"; then
    SEED_RAN=1
  else
    fail "Seed failed (exit non-zero). Fix errors above; Mongo and Milvus must be reachable."
  fi
fi

[[ "$SEED_RAN" -eq 1 ]] || fail "No working Python runner (mamba env teleoscope, micromamba, or PATH). Install deps and try: mamba activate teleoscope; PYTHONPATH=. python scripts/seed-demo-corpus.py"

ok "Seed script exited successfully"

DEMO_WORKSPACE_ID=""
if [[ -f "$REPO_ROOT/.demo_corpus_workspace_id" ]]; then
  DEMO_WORKSPACE_ID=$(cat "$REPO_ROOT/.demo_corpus_workspace_id" | tr -d '\r\n')
fi
if [[ -z "$DEMO_WORKSPACE_ID" ]]; then
  warn "No .demo_corpus_workspace_id after seed (unexpected)"
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
  warn "Could not read workspace ID from .demo_corpus_workspace_id. App will auto-discover demo corpus by label \"Demo corpus\" in Mongo."
fi

if [[ "${VERIFY_REFRESH:-1}" != "0" ]]; then
  section "Verify Mongo doc count vs Milvus partition (app check skipped)"
  info "Set VERIFY_REFRESH=0 to skip. For more detail: REFRESH_VERBOSE=1 or DEMO_STATUS_SKIP_APP=1 ./scripts/demo-status.sh -v"
  _ds_args=()
  [[ "${REFRESH_VERBOSE:-0}" == "1" ]] && _ds_args+=(-v)
  DEMO_STATUS_SKIP_APP=1 ./scripts/demo-status.sh "${_ds_args[@]}" "${REFRESH_DEMO_STATUS_URL:-http://localhost:3000}" || true
fi

section "Restart app"
info "Recreating app container..."
docker compose up -d --force-recreate app
ok "App container recreated"

echo ""
echo -e "${GREEN}=== Demo corpus refreshed ===${NC}"
echo "  App is restarting; open http://localhost:3000/demo when ready."
echo '  Confirm vectors: mamba activate teleoscope; PYTHONPATH=. python scripts/milvus-status.py --workspace "$(cat .demo_corpus_workspace_id)"'
echo ""
