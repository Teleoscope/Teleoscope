#!/usr/bin/env bash
# One-click: start full stack with Docker, then run all tests (unit, connectivity, Playwright, pipeline e2e).
# Requires: Docker, docker compose, and Node/pnpm + Python on the host for running tests.
# Usage: ./scripts/one-click-test.sh
set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Path for python/pnpm
PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
for env_bin in "$HOME/.local/share/mamba/envs/teleoscope/bin" "/opt/homebrew/Caskroom/miniconda/base/envs/teleoscope/bin"; do
  [[ -d "$env_bin" ]] && PATH="$env_bin:$PATH" && break
done

echo "=== One-click test: start stack, then run all tests ==="
echo ""

# 1. Ensure .env exists
if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "Created .env from .env.example. Edit if you need different credentials."
  else
    echo "No .env or .env.example found. Create .env with at least MONGODB_PASSWORD."
    exit 1
  fi
fi

# 2. Env for tests: connect to stack on localhost (Docker exposes ports)
# Load .env for MONGODB_PASSWORD etc.
if [[ -f .env ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      export "${BASH_REMATCH[1]}=${BASH_REMATCH[2]}"
    fi
  done < .env
fi
export MONGODB_URI="${MONGODB_URI:-mongodb://teleoscope:${MONGODB_PASSWORD:-teleoscope_dev_password}@localhost:27017/?directConnection=true&serverSelectionTimeoutMS=5000&authSource=admin}"
export MONGODB_HOST=localhost
export MONGODB_DATABASE="${MONGODB_DATABASE:-teleoscope}"
export RABBITMQ_HOST=localhost
export RABBITMQ_DISPATCH_QUEUE="${RABBITMQ_DISPATCH_QUEUE:-teleoscope-dispatch}"
export RABBITMQ_TASK_QUEUE="${RABBITMQ_TASK_QUEUE:-teleoscope-tasks}"
export BASE_URL=http://localhost:3000
export PLAYWRIGHT_BASE_URL=http://localhost:3000
export PLAYWRIGHT_MONGODB_URI="$MONGODB_URI"
export RUN_E2E=1

# 3. Start stack with Docker Compose
if ! command -v docker &>/dev/null; then
  echo "Docker not found. Install Docker and run: docker compose up -d && RUN_E2E=1 ./scripts/run-all-tests.sh"
  exit 1
fi
echo "Starting stack (docker compose up -d)..."
export MILVUS_HOST_PORT="${MILVUS_HOST_PORT:-0}"
docker compose up -d

MILVUS_PORT_LINE="$(docker compose port milvus 19530 2>/dev/null || true)"
if [[ -z "$MILVUS_PORT_LINE" ]]; then
  echo "Could not resolve Milvus host port mapping."
  docker compose logs milvus 2>/dev/null | tail -20
  exit 1
fi
MILVUS_HOST_PORT_RESOLVED="${MILVUS_PORT_LINE##*:}"
export MILVUS_HOST=localhost
export MIVLUS_PORT="$MILVUS_HOST_PORT_RESOLVED"
echo "Resolved Milvus host port: $MILVUS_HOST_PORT_RESOLVED"

# 4. Wait for services (with timeout)
wait_for() {
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
  return 0
}
echo "Waiting for services..."
wait_for "MongoDB" "nc -z localhost 27017" 45 || { docker compose logs mongodb 2>/dev/null | tail -20; exit 1; }
wait_for "RabbitMQ" "nc -z localhost 5672" 30 || { docker compose logs rabbitmq 2>/dev/null | tail -20; exit 1; }
wait_for "Milvus" "nc -z localhost $MILVUS_HOST_PORT_RESOLVED" 90 || { docker compose logs milvus 2>/dev/null | tail -20; exit 1; }
wait_for "App" "curl -sf --connect-timeout 2 http://localhost:3000/api/hello | grep -q hello" 60 || { docker compose logs app 2>/dev/null | tail -30; exit 1; }
echo "Stack is up."
echo ""

# 5. Run all tests (unit, connectivity, Playwright, pipeline e2e)
./scripts/run-all-tests.sh
