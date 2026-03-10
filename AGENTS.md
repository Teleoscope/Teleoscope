# Agents Instructions

## Cursor Cloud specific instructions

### Architecture overview

Teleoscope is a qualitative research platform with:
- Next.js 14 frontend in `teleoscope.ca/`
- Python backend + Celery workers in `backend/`
- Infrastructure services: MongoDB, RabbitMQ, Milvus (plus etcd + MinIO)

See `README.md` for complete architecture details.

### Fast bootstrap (new Cloud agents)

1. Install deps if missing:
   - `python -m pip install -r backend/requirements.txt -r requirements-test.txt`
   - `cd teleoscope.ca && pnpm install && pnpm exec playwright install chromium && cd ..`
2. Ensure `.env` exists at repo root (usually already present).
3. Start stack:
   - `docker compose up -d`
4. Validate:
   - `./scripts/test-stack.sh http://localhost:3000`

If Docker is unavailable, use:
- `./scripts/one-click-test-no-docker.sh`

### Running services (critical details)

**Infrastructure** (Docker):
- MongoDB replica set (`27017`)
- RabbitMQ (`5672`, `15672`)
- Milvus + etcd + MinIO (host port is auto-assigned unless `MILVUS_HOST_PORT` is set)

MongoDB **must** run as a single-node replica set because account creation uses transactions.

Manual MongoDB startup (if needed):

```bash
docker rm -f teleoscope-mongodb 2>/dev/null
docker run -d --name teleoscope-mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=admin_password \
  -e MONGO_INITDB_DATABASE=teleoscope \
  -v /workspace/docker/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro \
  mongo:7 bash -c "openssl rand -base64 756 > /tmp/keyfile && chmod 400 /tmp/keyfile && chown 999:999 /tmp/keyfile && exec docker-entrypoint.sh mongod --replSet rs0 --keyFile /tmp/keyfile"
sleep 5
docker exec teleoscope-mongodb mongosh -u admin -p admin_password --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'localhost:27017'}]})"
```

For RabbitMQ + Milvus:
- `docker compose up -d rabbitmq etcd minio milvus` (run `docker compose port milvus 19530` to see the mapped host port)

Frontend dev server:
- `cd teleoscope.ca && pnpm dev` (port `3000`)
- `.env.local` must use Mongo URI with `/teleoscope` and `authSource=admin`.

### Login/auth quick notes

- Local dev auth is email/password; no external SSO required.
- Signup page: `http://localhost:3000/auth/signup`
- Optional health auth check:
  - set `HEALTH_AUTH_USER` and `HEALTH_AUTH_PASS`
  - run `curl -u "$HEALTH_AUTH_USER:$HEALTH_AUTH_PASS" http://localhost:3000/api/health`
- For Playwright account tests (`teleoscope.ca/tests/account.spec.ts`), set:
  - `TEST_EMAIL`
  - `TEST_PASSWORD`

### Environment toggles (testing shortcuts)

- `PLAYWRIGHT_BASE_URL=http://localhost:3000` (reuse running app)
- `PLAYWRIGHT_SKIP_ACCOUNT=1` (skip signup/account tests)
- `PLAYWRIGHT_PROJECT=chromium` (match CI browser target)
- `PLAYWRIGHT_UI_COMPONENT_E2E=1` (sidebar component e2e)
- `PLAYWRIGHT_UI_EXPORT_E2E=1` (export button e2e)
- `PLAYWRIGHT_UI_UPLOADER_E2E=1` (CSV uploader e2e)
- `PLAYWRIGHT_UI_VECTOR_E2E=1` (large vectorization e2e)
- `RUN_E2E=1` (include backend vector e2e in full script)
- `MILVUS_LITE_PATH=./.milvus_lite_test` (non-Docker vector runs)

### Key gotchas

- **MongoDB replica set is required** for account transactions.
- **Mongo URI must include `/teleoscope`**, or DB selection is wrong.
- **Stripe is optional locally**: `STRIPE_TEST_SECRET_KEY` may be absent.
- **API/server routes use `dynamic = 'force-dynamic'`** to avoid prerender DB failures.
- **`hdbscan` build prereqs**: `python3-dev` and `build-essential`.
- **Schema generation**: run `python loadschemas.py` in `teleoscope.ca/`.
- **`pnpm install --ignore-scripts` is safe**; do not add `pnpm.onlyBuiltDependencies`.
- **`MIVLUS_PORT` typo is intentional**; do not rename in only one location.
- **Celery in Docker needs `C_FORCE_ROOT=1`**.

### Common commands

| Task | Command |
|------|---------|
| Lint | `cd teleoscope.ca && pnpm lint` |
| Backend unit tests | `PYTHONPATH=. python -m pytest tests/ -m "not integration and not e2e" -v` |
| Frontend modular tests | `cd teleoscope.ca && pnpm test:unit` |
| API/frontend contract checks | `cd teleoscope.ca && PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_SKIP_ACCOUNT=1 pnpm exec playwright test tests/api-frontend-contract.spec.ts tests/api.spec.ts -g "Frontend/API contract consistency|UI endpoint references resolve to backend routes" --project=chromium --retries=0` |
| Playwright e2e | `cd teleoscope.ca && PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_SKIP_ACCOUNT=1 pnpm exec playwright test --project=chromium` |
| Playwright UI core/demo bundle (chunk 1) | `cd teleoscope.ca && PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_SKIP_ACCOUNT=1 PLAYWRIGHT_UI_COMPONENT_E2E=1 PLAYWRIGHT_UI_EXPORT_E2E=1 PLAYWRIGHT_UI_UPLOADER_E2E=1 pnpm exec playwright test tests/sidebar-components-e2e.spec.ts tests/export-buttons-ui.spec.ts tests/csv-uploader-ui.spec.ts tests/demo-public.spec.ts --project=chromium --retries=0` |
| Playwright vectorization sweep (manual/scheduled) | `cd teleoscope.ca && PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_SKIP_ACCOUNT=1 PLAYWRIGHT_UI_VECTOR_E2E=1 PLAYWRIGHT_UI_VECTOR_DOC_COUNT=10 PLAYWRIGHT_VECTOR_RESULT_TIMEOUT_MS=300000 pnpm exec playwright test tests/ui-vectorization-large.spec.ts --project=chromium --retries=0 && PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_SKIP_ACCOUNT=1 PLAYWRIGHT_UI_VECTOR_E2E=1 PLAYWRIGHT_UI_VECTOR_DOC_COUNT=100 PLAYWRIGHT_VECTOR_RESULT_TIMEOUT_MS=600000 pnpm exec playwright test tests/ui-vectorization-large.spec.ts --project=chromium --retries=0` |
| Dev server | `cd teleoscope.ca && pnpm dev` |
| Full test suite | `./scripts/run-all-tests.sh` |
| Seed test data | `PYTHONPATH=. python scripts/seed-test-data.py` |
| Docker full stack | `cp .env.example .env && docker compose up -d` |
| One-click public demo bootstrap | `./scripts/one-click-demo.sh` |
| Public demo load test | `node scripts/load-test-demo.mjs http://localhost:3000 250 15` (CI smoke), `node scripts/load-test-demo.mjs http://localhost:3000 5000 30` (conference target) |

### Area-specific workflows

#### A) Full stack orchestration (`scripts/`, `docker-compose.yml`)
1. `docker compose up -d`
2. `./scripts/test-stack.sh http://localhost:3000`
3. `curl -sf http://localhost:3000/api/hello`

#### B) Frontend app (`teleoscope.ca/`)
- Smoke: `PLAYWRIGHT_PROJECT=chromium PLAYWRIGHT_SKIP_ACCOUNT=1 pnpm exec playwright test tests/corporate.spec.ts --project=chromium`
- Account/auth flow: set `TEST_EMAIL` + `TEST_PASSWORD`, then run `pnpm exec playwright test tests/account.spec.ts --project=chromium`
- If app already running: `PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm exec playwright test --project=chromium`

#### C) Backend core (`backend/`, `tests/`)
- Unit-focused: `PYTHONPATH=. python -m pytest tests/ -m "not integration and not e2e" -v --tb=short`
- Integration only: `PYTHONPATH=. python -m pytest tests/ -m integration -v`

#### D) Vector pipeline/workers (`backend.dispatch`, `backend.vectorizer`, `backend.uploader`, `backend.graph`, `tests/e2e/`)
1. Ensure MongoDB + RabbitMQ + Milvus + workers are up.
2. Run `PYTHONPATH=. python -m pytest tests/e2e/ -m e2e -v`
3. Shortcut: `RUN_E2E=1 ./scripts/run-all-tests.sh`

### Fast failure triage

- App unreachable:
  - `docker compose ps`
  - `docker compose logs app --tail 100`
- RabbitMQ/Mongo errors:
  - rerun `./scripts/test-stack.sh` and follow WARN output.
- Playwright fails due to missing Mongo:
  - set `PLAYWRIGHT_SKIP_ACCOUNT=1` and rerun Chromium smoke first.
- Vector e2e stalls:
  - verify dispatch/vectorizer/uploader/graph workers are running.
 - if needed, verify mapped Milvus host port with `docker compose port milvus 19530`.

### Maintenance rule for this file

When runbook knowledge changes:
1. Update the relevant section (A/B/C/D), not a generic dump area.
2. Include exact command, preconditions, success signal, and a one-line failure hint.
3. Replace outdated steps instead of adding duplicates.
