#!/usr/bin/env bash
# Start Next.js dev server with localhost MongoDB so Playwright can run e2e without Docker.
# Next.js loads .env.local and can override env; we force localhost so e2e works without Docker.
# Set PLAYWRIGHT_MONGODB_URI for auth (e.g. mongodb://user:pass@localhost:27017).
cd "$(dirname "$0")/.."
export PORT="${PORT:-3099}"
if [[ -n "$PLAYWRIGHT_MONGODB_URI" ]]; then
  export MONGODB_URI="$PLAYWRIGHT_MONGODB_URI"
else
  export MONGODB_URI="mongodb://localhost:27017"
fi
export MONGODB_HOST="localhost"
export PLAYWRIGHT_E2E="1"
exec pnpm dev
