#!/usr/bin/env bash
# One-time setup to run Teleoscope on this Mac without Docker.
# Installs MongoDB and RabbitMQ via Homebrew and creates .env for localhost.
set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== Teleoscope local setup (no Docker) ==="

# Homebrew (ensure PATH includes common install locations)
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v brew &>/dev/null; then
  echo "Install Homebrew first: https://brew.sh"
  exit 1
fi

# MongoDB
if ! command -v mongod &>/dev/null; then
  echo "Installing MongoDB..."
  brew tap mongodb/brew
  brew install mongodb-community
  echo "Start with: brew services start mongodb-community"
else
  echo "MongoDB already installed."
fi

# RabbitMQ
if ! command -v rabbitmq-server &>/dev/null; then
  echo "Installing RabbitMQ..."
  brew install rabbitmq
  echo "Add to PATH: export PATH=\$PATH:\$(brew --prefix)/opt/rabbitmq/sbin"
  echo "Start with: brew services start rabbitmq"
else
  echo "RabbitMQ already installed."
fi

# .env for local (no Docker)
if [[ ! -f .env ]]; then
  cp .env.example .env
  # Override hosts for local
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' 's/MONGODB_HOST=mongodb/MONGODB_HOST=localhost/' .env
    sed -i '' 's/RABBITMQ_HOST=rabbitmq/RABBITMQ_HOST=localhost/' .env
    # Local MongoDB often runs without auth
    sed -i '' 's|MONGODB_URI=mongodb://teleoscope:teleoscope_dev_password@mongodb:27017|MONGODB_URI=mongodb://localhost:27017|' .env
    sed -i '' 's|MONGODB_REGISTRAR_URI=mongodb://teleoscope:teleoscope_dev_password@mongodb:27017|MONGODB_REGISTRAR_URI=mongodb://localhost:27017|' .env
  fi
  echo "Created .env (localhost)."
else
  echo ".env exists; not overwriting."
fi

# teleoscope.ca .env.local
TELEO_ENV="$REPO_ROOT/teleoscope.ca/.env.local"
if [[ ! -f "$TELEO_ENV" ]]; then
  cp .env "$TELEO_ENV" 2>/dev/null || true
  if [[ -f .env ]]; then
    (cd teleoscope.ca && cp ../.env .env.local 2>/dev/null || true)
  fi
  echo "Ensure teleoscope.ca/.env.local points to localhost (MONGODB_HOST, RABBITMQ_HOST)."
fi

echo ""
echo "Next:"
echo "  1. Start services:  brew services start mongodb-community rabbitmq"
echo "  2. Start the stack: ./scripts/start-local-stack.sh"
echo "  3. Run tests:       ./scripts/run-tests.sh  and  ./scripts/test-stack.sh"
