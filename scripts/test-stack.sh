#!/usr/bin/env bash
# Test Docker Compose stack connectivity. Run after: docker compose up -d
# Usage: ./scripts/test-stack.sh [base_url]
set -e

BASE_URL="${1:-http://localhost:3000}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()  { echo -e "${GREEN}  OK${NC} $1"; }
fail() { echo -e "${RED}  FAIL${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}  WARN${NC} $1"; }

echo "Testing stack (base: $BASE_URL)..."
echo ""

# 1. App (Next.js)
echo -n "App (Next.js) ... "
if curl -sf --connect-timeout 5 "$BASE_URL/api/hello" | grep -q '"hello"'; then
  ok "GET $BASE_URL/api/hello"
else
  fail "App not responding at $BASE_URL"
fi

# 2. RabbitMQ management UI
echo -n "RabbitMQ (management) ... "
RABBIT_CODE=$(curl -sf -o /dev/null -w "%{http_code}" --connect-timeout 5 http://localhost:15672 2>/dev/null || echo "000")
if [ "$RABBIT_CODE" = "200" ] || [ "$RABBIT_CODE" = "301" ] || [ "$RABBIT_CODE" = "302" ]; then
  ok "http://localhost:15672 ($RABBIT_CODE)"
else
  warn "http://localhost:15672 (code $RABBIT_CODE - is RabbitMQ up?)"
fi

# 3. Files API (FastAPI)
echo -n "Files API ... "
FILES_CODE=$(curl -sf -o /dev/null -w "%{http_code}" --connect-timeout 5 http://localhost:8000/docs 2>/dev/null || echo "000")
if [ "$FILES_CODE" = "200" ]; then
  ok "http://localhost:8000/docs"
else
  warn "http://localhost:8000 (code $FILES_CODE)"
fi

# 4. MongoDB (TCP)
echo -n "MongoDB (port) ... "
if command -v nc >/dev/null 2>&1 && nc -z localhost 27017 2>/dev/null; then
  ok "localhost:27017"
elif command -v timeout >/dev/null 2>&1 && timeout 1 bash -c 'cat < /dev/null > /dev/tcp/localhost/27017' 2>/dev/null; then
  ok "localhost:27017"
else
  warn "localhost:27017 (cannot probe; is MongoDB up?)"
fi

# 5. Milvus (TCP)
echo -n "Milvus (port) ... "
if command -v nc >/dev/null 2>&1 && nc -z localhost 19530 2>/dev/null; then
  ok "localhost:19530"
elif command -v timeout >/dev/null 2>&1 && timeout 1 bash -c 'cat < /dev/null > /dev/tcp/localhost/19530' 2>/dev/null; then
  ok "localhost:19530"
else
  warn "localhost:19530 (Milvus may still be starting)"
fi

echo ""
echo -e "${GREEN}Connectivity check done.${NC}"
echo "For full health (with auth), set HEALTH_AUTH_USER and HEALTH_AUTH_PASS, then:"
echo "  curl -u \$HEALTH_AUTH_USER:\$HEALTH_AUTH_PASS $BASE_URL/api/health"
