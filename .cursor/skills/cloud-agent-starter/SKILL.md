---
name: teleoscope-cloud-agent-starter
description: Minimal Cloud-agent runbook for Teleoscope setup, login/auth flow, environment toggles, and area-specific testing workflows.
---

# Teleoscope: Cloud Agent Starter Skill

## When to use this skill
Use this first when you are a new Cloud agent in this repo and need to get productive quickly (start app, sign in, run targeted tests, and know what to skip/mock when infra is missing).

## 1) Fast bootstrap (first 5-10 minutes)
1. From repo root, install host test dependencies (only needed if missing):
   - `python -m pip install -r backend/requirements.txt -r requirements-test.txt`
   - `cd teleoscope.ca && pnpm install && pnpm exec playwright install chromium && cd ..`
2. Ensure `.env` exists at repo root (this repo usually already has one).  
3. Start full stack:
   - `docker compose up -d`
4. Validate stack wiring:
   - `./scripts/test-stack.sh http://localhost:3000`

If Docker is unavailable, use non-Docker stack flow:
- `./scripts/one-click-test-no-docker.sh` (runs stack + tests together)

## 2) Login/auth basics (what Cloud agents need immediately)
- No external SSO login is required for local dev runs.
- App authentication is local email/password (Lucia + MongoDB).
- For manual UI work, create a disposable account at:
  - `http://localhost:3000/auth/signup`
- Health endpoint auth (optional, for deeper checks):
  - Set `HEALTH_AUTH_USER` and `HEALTH_AUTH_PASS`
  - Run: `curl -u "$HEALTH_AUTH_USER:$HEALTH_AUTH_PASS" http://localhost:3000/api/health`

For Playwright account tests (`teleoscope.ca/tests/account.spec.ts`), set:
- `TEST_EMAIL`
- `TEST_PASSWORD`

Example:
- `export TEST_EMAIL="agent+$(date +%s)@example.com"`
- `export TEST_PASSWORD="agent-password-123"`

## 3) Environment toggles / mock switches
Use these to quickly adapt tests to limited environments.

- `PLAYWRIGHT_BASE_URL=http://localhost:3000`  
  Reuse an already-running app instead of Playwright's webServer.
- `PLAYWRIGHT_SKIP_ACCOUNT=1`  
  Skip account signup tests when Mongo/test credentials are not ready.
- `PLAYWRIGHT_PROJECT=chromium`  
  Run the browser target used in CI.
- `PLAYWRIGHT_UI_COMPONENT_E2E=1`  
  Enable sidebar component system e2e (`sidebar-components-e2e.spec.ts`).
- `PLAYWRIGHT_UI_EXPORT_E2E=1`  
  Enable export button system e2e (`export-buttons-ui.spec.ts`).
- `PLAYWRIGHT_UI_UPLOADER_E2E=1`  
  Enable CSV uploader system e2e (`csv-uploader-ui.spec.ts`).
- `PLAYWRIGHT_UI_VECTOR_E2E=1`  
  Enable the large UI vectorization e2e test (`ui-vectorization-large.spec.ts`).
- `RUN_E2E=1`  
  Include backend vector-pipeline e2e test in `./scripts/run-all-tests.sh`.
- `MILVUS_LITE_PATH=./.milvus_lite_test`  
  Enable local file-based Milvus Lite path for non-Docker vector pipeline runs.

## 4) Codebase-area workflows

### Area A: Full stack orchestration (`/scripts`, `docker-compose.yml`)
Primary use: bring up all services and verify service connectivity.

Happy-path workflow:
1. `docker compose up -d`
2. `./scripts/test-stack.sh http://localhost:3000`
3. `curl -sf http://localhost:3000/api/hello`
4. If you need host-level Milvus access, resolve mapped port with `docker compose port milvus 19530` (or set `MILVUS_HOST_PORT` in `.env` for a fixed mapping).

Use `./scripts/one-click-test.sh` when you want stack startup + full test sweep in one command.

### Area B: Frontend app (`teleoscope.ca/`)
Primary use: UI/API route behavior, auth pages, smoke e2e.

Quick smoke:
1. `cd teleoscope.ca`
2. `PLAYWRIGHT_PROJECT=chromium PLAYWRIGHT_SKIP_ACCOUNT=1 pnpm exec playwright test tests/corporate.spec.ts --project=chromium`

Account/auth flow test:
1. Ensure MongoDB is reachable from app/test process.
2. Export `TEST_EMAIL` + `TEST_PASSWORD`.
3. `pnpm exec playwright test tests/account.spec.ts --project=chromium`

If app is already running on 3000:
- `PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm exec playwright test --project=chromium`

Frontend modular uploader/component tests:
1. `cd teleoscope.ca`
2. `pnpm test:unit`

API/frontend contract consistency checks:
1. `cd teleoscope.ca`
2. `PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_SKIP_ACCOUNT=1 pnpm exec playwright test tests/api-frontend-contract.spec.ts tests/api.spec.ts -g "Frontend/API contract consistency|UI endpoint references resolve to backend routes" --project=chromium --retries=0`

Full system UI e2e bundle (chunked):
1. Ensure Docker stack is healthy (`./scripts/test-stack.sh http://localhost:3000`).
2. Chunk 1 (core/demo): `PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_SKIP_ACCOUNT=1 PLAYWRIGHT_UI_COMPONENT_E2E=1 PLAYWRIGHT_UI_EXPORT_E2E=1 PLAYWRIGHT_UI_UPLOADER_E2E=1 pnpm exec playwright test tests/sidebar-components-e2e.spec.ts tests/export-buttons-ui.spec.ts tests/csv-uploader-ui.spec.ts tests/demo-public.spec.ts --project=chromium --retries=0`
3. Vector sweep (manual/scheduled): `PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_SKIP_ACCOUNT=1 PLAYWRIGHT_UI_VECTOR_E2E=1 PLAYWRIGHT_UI_VECTOR_DOC_COUNT=10 PLAYWRIGHT_VECTOR_RESULT_TIMEOUT_MS=300000 pnpm exec playwright test tests/ui-vectorization-large.spec.ts --project=chromium --retries=0 && PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_SKIP_ACCOUNT=1 PLAYWRIGHT_UI_VECTOR_E2E=1 PLAYWRIGHT_UI_VECTOR_DOC_COUNT=100 PLAYWRIGHT_VECTOR_RESULT_TIMEOUT_MS=600000 pnpm exec playwright test tests/ui-vectorization-large.spec.ts --project=chromium --retries=0`
4. Optional conference demo stress check: `node scripts/load-test-demo.mjs http://localhost:3000 5000 30`

### Area C: Backend core (`backend/` + `tests/`)
Primary use: fast Python correctness checks and service-backed integration tests.

Unit-focused run (default high-signal check):
- `PYTHONPATH=. python -m pytest tests/ -m "not integration and not e2e" -v --tb=short`

Integration-only run (needs live services):
- `PYTHONPATH=. python -m pytest tests/ -m integration -v`

### Area D: Vector pipeline and workers (`backend.dispatch`, `backend.vectorizer`, `backend.uploader`, `backend.graph`, `tests/e2e/`)
Primary use: upload -> vectorize -> rank/search pipeline validation.

Full pipeline check:
1. Ensure MongoDB + RabbitMQ + Milvus + workers are up (Docker stack recommended).
2. `PYTHONPATH=. python -m pytest tests/e2e/ -m e2e -v`

Shortcut:
- `RUN_E2E=1 ./scripts/run-all-tests.sh`

## 5) Common failure triage (fast)
- App not reachable:
  - `docker compose ps`
  - `docker compose logs app --tail 100`
- RabbitMQ/Mongo not reachable:
  - rerun `./scripts/test-stack.sh` and follow WARN lines.
- Playwright fails because Mongo is absent:
  - set `PLAYWRIGHT_SKIP_ACCOUNT=1` and rerun Chromium smoke suite first.
- Vector e2e stalls:
  - verify dispatch/vectorizer/uploader/graph workers are running in compose output.
  - if needed, check mapped Milvus host port with `docker compose port milvus 19530`.

## 6) How to update this skill when new runbook knowledge is discovered
Keep this file minimal and operational. When you discover a new testing trick or runbook fix:
1. Add it under the relevant area (A/B/C/D), not in a generic dump section.
2. Include:
   - exact command
   - required preconditions
   - expected success signal
   - one-line failure hint
3. Prefer replacing outdated steps over adding duplicates.
4. If CI behavior changes, update the matching local command here in the same commit.
