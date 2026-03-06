#!/usr/bin/env bash
# Start Teleoscope on this machine without Docker.
# Prereqs: ./scripts/setup-local-macos.sh, brew services start mongodb-community rabbitmq
# Uses .env (and teleoscope.ca/.env.local) with localhost for MongoDB and RabbitMQ.
# If MILVUS_LITE_PATH is set (e.g. ./.milvus_lite_test), starts vectorizer, uploader, graph (Milvus Lite).
set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -f .env ]]; then
  echo "Run ./scripts/setup-local-macos.sh first."
  exit 1
fi

# Homebrew and RabbitMQ on PATH
export PATH="/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/opt/rabbitmq/sbin:$PATH"

# Load .env (simple key=value, no export)
if [[ -f .env ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      export "${BASH_REMATCH[1]}=${BASH_REMATCH[2]}"
    fi
  done < .env
fi
export PYTHONPATH="$REPO_ROOT"

# Run with: mamba activate teleoscope && ./scripts/start-local-stack.sh

# Ensure Mongo and RabbitMQ are running
if ! (mongosh --eval "db.adminCommand('ping')" --quiet 2>/dev/null || mongo --eval "db.adminCommand('ping')" --quiet 2>/dev/null); then
  echo "Start MongoDB: brew services start mongodb-community"
  exit 1
fi
if ! rabbitmqctl status &>/dev/null; then
  echo "Start RabbitMQ: brew services start rabbitmq"
  echo "If not in PATH: export PATH=\$PATH:\$(brew --prefix)/opt/rabbitmq/sbin"
  exit 1
fi

PID_DIR="$REPO_ROOT/.local-stack-pids"
mkdir -p "$PID_DIR"
cleanup() {
  echo "Stopping local stack..."
  for f in "$PID_DIR"/*.pid; do
    [[ -f "$f" ]] && kill "$(cat "$f")" 2>/dev/null || true
  done
  rm -rf "$PID_DIR"
}
trap cleanup EXIT

# Milvus Lite: MILVUS_LITE_PATH set => run vector pipeline (vectorizer, uploader, graph)
USE_VECTOR_PIPELINE=
if [[ -n "${MILVUS_LITE_PATH:-}" ]]; then
  USE_VECTOR_PIPELINE=1
  if [[ "$MILVUS_LITE_PATH" != /* ]]; then
    export MILVUS_LITE_PATH="$REPO_ROOT/$MILVUS_LITE_PATH"
  fi
fi

if [[ -n "$USE_VECTOR_PIPELINE" ]]; then
  echo "Starting Teleoscope (no Docker, with vector pipeline via Milvus Lite)..."
else
  echo "Starting Teleoscope (no Docker, no vector pipeline). Set MILVUS_LITE_PATH to a path for full pipeline."
fi

# 1. Celery worker (tasks)
python -m celery -A backend.tasks worker --loglevel=info -Q teleoscope-tasks &
echo $! > "$PID_DIR/tasks.pid"

# 2. Dispatch
python -m backend.dispatch &
echo $! > "$PID_DIR/dispatch.pid"

# 3. Files API
(cd "$REPO_ROOT/backend" && python -m gunicorn -w 1 -k uvicorn.workers.UvicornWorker files:app --bind 0.0.0.0:8000) &
echo $! > "$PID_DIR/files.pid"

# 4. App (Next.js) — use dev so no build required
(cd "$REPO_ROOT/teleoscope.ca" && pnpm dev) &
echo $! > "$PID_DIR/app.pid"

if [[ -n "$USE_VECTOR_PIPELINE" ]]; then
  # 5. Vectorizer
  python -m backend.vectorizer &
  echo $! > "$PID_DIR/vectorizer.pid"
  # 6. Uploader
  python -m backend.uploader &
  echo $! > "$PID_DIR/uploader.pid"
  # 7. Graph worker (UMAP, HDBSCAN, vector ops)
  python -m celery -A backend.graph worker --loglevel=info -Q graph &
  echo $! > "$PID_DIR/graph.pid"
fi

echo "Stack started. App: http://localhost:3000  Files API: http://localhost:8000"
[[ -n "$USE_VECTOR_PIPELINE" ]] && echo "Vector pipeline: vectorizer, uploader, graph (Milvus Lite)."
echo "PIDs in $PID_DIR. Press Ctrl+C to stop."
wait
