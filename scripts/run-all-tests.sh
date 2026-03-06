#!/usr/bin/env bash
# Run all tests: backend unit, stack connectivity, frontend e2e (Playwright).
# Unit tests need no services. Connectivity and Playwright need the stack (or Playwright can start it).
# Prereqs: mamba env "teleoscope" active, or set PYTHON/NODE via path.
# Optional: start stack first with ./scripts/start-local-stack.sh (then Playwright reuses it).
set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
# Prefer mamba/conda env so we get correct python and pnpm
for env_bin in "$HOME/.local/share/mamba/envs/teleoscope/bin" "/opt/homebrew/Caskroom/miniconda/base/envs/teleoscope/bin"; do
  if [[ -d "$env_bin" ]]; then PATH="$env_bin:$PATH"; break; fi
done
PY="${PY:-}"
if [[ -z "$PY" || ! -x "$PY" ]]; then
  command -v python &>/dev/null  && PY="$(command -v python)" || true
  [[ -z "$PY" ]] && command -v python3 &>/dev/null && PY="$(command -v python3)" || true
  [[ -z "$PY" && -x "$HOME/.local/share/mamba/envs/teleoscope/bin/python" ]] && PY="$HOME/.local/share/mamba/envs/teleoscope/bin/python"
  [[ -z "$PY" && -x "/opt/homebrew/Caskroom/miniconda/base/envs/teleoscope/bin/python" ]] && PY="/opt/homebrew/Caskroom/miniconda/base/envs/teleoscope/bin/python"
fi
if [[ -z "$PY" || ! -x "$PY" ]]; then
  echo "No Python found. Activate mamba env: mamba activate teleoscope (or set PY=path/to/python)"
  exit 1
fi

echo "=== 1. Backend unit tests (pytest -m 'not integration and not e2e') ==="
PYTHONPATH="$REPO_ROOT" "$PY" -m pytest tests/ -m "not integration and not e2e" -v --tb=short
echo ""

echo "=== 2. Stack connectivity (App, RabbitMQ, Files API, MongoDB, Milvus port) ==="
./scripts/test-stack.sh "${BASE_URL:-http://localhost:3000}" || {
  echo "Stack check had warnings/failures. Start stack: ./scripts/start-local-stack.sh"
  echo "Then re-run this script, or continue to let Playwright start the app for e2e."
  echo ""
}
echo ""

echo "=== 3. Frontend e2e (Playwright) ==="
cd "$REPO_ROOT/teleoscope.ca"
# So test process and app use localhost MongoDB when .env.local points at Docker host
export PLAYWRIGHT_E2E=1
export MONGODB_URI="${PLAYWRIGHT_MONGODB_URI:-mongodb://localhost:27017}"
export MONGODB_HOST=localhost
# Skip account.spec.ts (needs MongoDB) when MongoDB is not reachable
if ! nc -z localhost 27017 2>/dev/null; then
  export PLAYWRIGHT_SKIP_ACCOUNT=1
  echo "MongoDB not detected on localhost:27017 — skipping account.spec.ts (for full e2e: brew services start mongodb-community)"
fi
# Default to Chromium so script passes when only Chromium is installed (playwright install chromium)
PLAYWRIGHT_PROJECT="${PLAYWRIGHT_PROJECT:-chromium}"
PLAYWRIGHT_EXTRA="--project=$PLAYWRIGHT_PROJECT"
if [[ -n "$CI" ]]; then
  pnpm exec playwright test $PLAYWRIGHT_EXTRA
else
  pnpm exec playwright test --reporter=list $PLAYWRIGHT_EXTRA
fi
echo ""
if [[ -n "$RUN_E2E" ]]; then
  echo "=== 4. E2E (upload -> vectorize -> vector search) ==="
  PYTHONPATH="$REPO_ROOT" "$PY" -m pytest tests/e2e/ -m e2e -v --tb=short || true
  echo ""
fi
echo "If Playwright failed:"
echo "  - Browsers not installed? Run: cd teleoscope.ca && pnpm exec playwright install (or 'playwright install chromium' for Chromium only)"
echo "  - Run only Chromium (if others missing): PLAYWRIGHT_PROJECT=chromium ./scripts/run-all-tests.sh"
echo "  - ECONNREFUSED localhost:27017? Start MongoDB: brew services start mongodb-community"
echo "To run pipeline e2e (upload->vector search): start full stack, set MONGODB_URI/RABBITMQ_*, then RUN_E2E=1 ./scripts/run-all-tests.sh"
