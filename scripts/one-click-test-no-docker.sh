#!/usr/bin/env bash
# One-click: run full stack and all tests on this machine without Docker.
# Uses Homebrew MongoDB + RabbitMQ and Milvus Lite (file-based) for the vector pipeline.
# Usage: ./scripts/one-click-test-no-docker.sh
set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
for env_bin in "$HOME/.local/share/mamba/envs/teleoscope/bin" "/opt/homebrew/Caskroom/miniconda/base/envs/teleoscope/bin"; do
  [[ -d "$env_bin" ]] && PATH="$env_bin:$PATH" && break
done
export PATH="$(brew --prefix 2>/dev/null)/opt/rabbitmq/sbin:$PATH"

echo "=== One-click test (no Docker): stack + all tests ==="
echo ""

# 1. Ensure .env exists and is set for local (no Docker)
if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "Created .env from .env.example."
  else
    echo "No .env or .env.example. Create .env first."
    exit 1
  fi
  # One-time local overrides (same as setup-local-macos.sh)
  [[ "$(uname)" == "Darwin" ]] && sed -i.bak 's/MONGODB_HOST=mongodb/MONGODB_HOST=localhost/' .env && sed -i.bak 's/RABBITMQ_HOST=rabbitmq/RABBITMQ_HOST=localhost/' .env
  [[ "$(uname)" == "Darwin" ]] && sed -i.bak 's|@mongodb:27017|@localhost:27017|g' .env
fi
if [[ ! -f teleoscope.ca/.env.local ]]; then
  cp .env teleoscope.ca/.env.local 2>/dev/null || true
fi
# Milvus Lite so vector pipeline runs without a Milvus server (use MILVUS_LITE_PATH so pymilvus import does not see a file URI)
grep -q "^MILVUS_LITE_PATH=" .env 2>/dev/null || echo "MILVUS_LITE_PATH=./.milvus_lite_test" >> .env

# 2. Start MongoDB and RabbitMQ
MONGOD_PID=""
if command -v brew &>/dev/null; then
  brew services start mongodb-community 2>/dev/null || true
  brew services start rabbitmq 2>/dev/null || true
fi
# If MongoDB still not up (e.g. brew services failed), start mongod in the background ourselves
if ! nc -z localhost 27017 2>/dev/null; then
  if command -v mongod &>/dev/null; then
    echo "Starting mongod from this script..."
    if command -v brew &>/dev/null && [[ -f "$(brew --prefix 2>/dev/null)/etc/mongod.conf" ]]; then
      mongod --config "$(brew --prefix)/etc/mongod.conf" &
    else
      mkdir -p "$REPO_ROOT/.mongodb-data"
      mongod --dbpath "$REPO_ROOT/.mongodb-data" --bind_ip localhost &
    fi
    MONGOD_PID=$!
  fi
fi
echo "Waiting for MongoDB and RabbitMQ..."
wait_for() {
  local name="$1"
  local cmd="$2"
  local max="${3:-60}"
  local hint="$4"
  local n=0
  while ! eval "$cmd" 2>/dev/null; do
    n=$((n + 1))
    if [[ $n -ge $max ]]; then
      echo "Timeout waiting for $name."
      [[ -n "$hint" ]] && echo "$hint"
      return 1
    fi
    sleep 2
  done
  echo "  $name ready"
  return 0
}
wait_for "MongoDB" "nc -z localhost 27017" 45 "Install MongoDB (e.g. brew install mongodb-community) or start it manually." || exit 1
wait_for "RabbitMQ" "nc -z localhost 5672" 30 "" || exit 1

# 3. Kill any leftover stack processes from a previous run (avoids "Address already in use")
PID_DIR="$REPO_ROOT/.local-stack-pids"
if [[ -d "$PID_DIR" ]]; then
  for f in "$PID_DIR"/*.pid; do
    [[ -f "$f" ]] && kill "$(cat "$f")" 2>/dev/null || true
  done
  rm -rf "$PID_DIR"
  sleep 2
fi
mkdir -p "$PID_DIR"
(
  export PYTHONPATH="$REPO_ROOT"
  if [[ -f .env ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
      if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
        export "${BASH_REMATCH[1]}=${BASH_REMATCH[2]}"
      fi
    done < .env
  fi
  if [[ -n "${MILVUS_LITE_PATH:-}" ]]; then
    [[ "$MILVUS_LITE_PATH" != /* ]] && export MILVUS_LITE_PATH="$REPO_ROOT/$MILVUS_LITE_PATH"
    unset MILVUS_URI
  fi
  PATH="$(brew --prefix 2>/dev/null)/opt/rabbitmq/sbin:$PATH"
  python -m celery -A backend.tasks worker --loglevel=info -Q teleoscope-tasks &
  echo $! > "$PID_DIR/tasks.pid"
  python -m backend.dispatch &
  echo $! > "$PID_DIR/dispatch.pid"
  (cd "$REPO_ROOT/backend" && python -m gunicorn -w 1 -k uvicorn.workers.UvicornWorker files:app --bind 0.0.0.0:8000) &
  echo $! > "$PID_DIR/files.pid"
  (cd "$REPO_ROOT/teleoscope.ca" && pnpm dev) &
  echo $! > "$PID_DIR/app.pid"
  python -m backend.vectorizer &
  echo $! > "$PID_DIR/vectorizer.pid"
  python -m backend.uploader &
  echo $! > "$PID_DIR/uploader.pid"
  python -m celery -A backend.graph worker --loglevel=info -Q graph &
  echo $! > "$PID_DIR/graph.pid"
  wait
) &
STACK_PID=$!
cleanup_stack() {
  echo "Stopping stack..."
  for f in "$PID_DIR"/*.pid; do
    [[ -f "$f" ]] && kill "$(cat "$f")" 2>/dev/null || true
  done
  kill $STACK_PID 2>/dev/null || true
  [[ -n "$MONGOD_PID" ]] && kill $MONGOD_PID 2>/dev/null || true
  rm -rf "$PID_DIR"
}
trap cleanup_stack EXIT

echo "Waiting for app at http://localhost:3000..."
wait_for "App" "curl -sf --connect-timeout 2 http://localhost:3000/api/hello 2>/dev/null | grep -q hello" 90 || {
  echo "App did not become ready. Check .local-stack-pids and logs."
  exit 1
}

# 4. Test env (tests run on host, connect to localhost)
export MONGODB_URI="${MONGODB_URI:-mongodb://teleoscope:teleoscope_dev_password@localhost:27017/?directConnection=true&serverSelectionTimeoutMS=5000&authSource=admin}"
export MONGODB_HOST=localhost
export MONGODB_DATABASE="${MONGODB_DATABASE:-teleoscope}"
export RABBITMQ_HOST=localhost
export RABBITMQ_DISPATCH_QUEUE="${RABBITMQ_DISPATCH_QUEUE:-teleoscope-dispatch}"
export RABBITMQ_TASK_QUEUE="${RABBITMQ_TASK_QUEUE:-teleoscope-tasks}"
export BASE_URL=http://localhost:3000
export PLAYWRIGHT_BASE_URL=http://localhost:3000
export PLAYWRIGHT_MONGODB_URI="$MONGODB_URI"
export RUN_E2E=1

# 5. Run all tests
./scripts/run-all-tests.sh
