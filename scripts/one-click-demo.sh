#!/usr/bin/env bash
# One-click demo bootstrap:
# 1) Start full Docker stack
# 2) Validate core services
# 3) Validate public demo endpoints
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

echo "Starting Teleoscope stack for public demo..."
docker compose up -d --build

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

echo "Checking public demo API..."
curl -sf "http://localhost:3000/api/demo/posts?limit=5" >/tmp/teleoscope_demo_api.json

echo "Checking public demo page..."
curl -sf "http://localhost:3000/demo" >/tmp/teleoscope_demo_page.html

echo "Running demo load smoke test..."
node scripts/load-test-demo.mjs http://localhost:3000 100 10

echo "Demo environment is ready."
echo "Open: http://localhost:3000/demo"
