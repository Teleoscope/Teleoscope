# Test suite

The test suite is **automated** and runs on every push and pull request to `main`. It is the guarantee that the system runs and that code changes are valid.

## What runs in CI

- **Workflow: `Test suite`**  
  - **Backend (unit):** `pytest tests/ -m "not integration"`  
  - **Frontend (e2e smoke):** Playwright Chromium on baseline UI flows.  
  - Keeps the fast merge gate green for everyday changes.

- **Workflow: `Playwright UI System E2E`**  
  - Starts the full Docker stack (MongoDB, RabbitMQ, Milvus, app, workers).  
  - Uses split strategy to avoid PR timeout loops:
    - **`ui-core-e2e`** runs on push/PR:
      - `tests/sidebar-components-e2e.spec.ts`
      - `tests/export-buttons-ui.spec.ts`
      - `tests/csv-uploader-ui.spec.ts`
      - `tests/demo-public.spec.ts`
      - `node scripts/load-test-demo.mjs http://localhost:3000 250 15`
    - **`ui-vectorization-full-e2e`** runs on schedule/manual dispatch:
      - `tests/ui-vectorization-large.spec.ts`
      - with `PLAYWRIGHT_UI_VECTOR_DOC_COUNT=1000`
      - with `PLAYWRIGHT_VECTOR_RESULT_TIMEOUT_MS=1200000` (20 min vector wait window)
  - This keeps PR checks stable while preserving full vector coverage outside the merge gate.

**Required status:** Protect `main` with branch rules that require both **“Test suite”** and **“Playwright UI System E2E”** to pass before merge.

## Running locally

**One-click: stack + all tests (no Docker, when Docker isn't available):**

```bash
./scripts/one-click-test-no-docker.sh
```

Single command: ensures `.env` for local, starts MongoDB/RabbitMQ via Homebrew, starts the full stack (app, workers, vector pipeline) using **Milvus Lite** (file-based), then runs all tests including pipeline e2e. Requires Homebrew, `./scripts/setup-local-macos.sh` once, and Python + Node/pnpm.

**One-click: stack + all tests (Docker):**

```bash
./scripts/one-click-test.sh
```

This script (1) ensures `.env` exists (from `.env.example` if needed), (2) starts the full stack with `docker compose up -d`, (3) waits for MongoDB, RabbitMQ, Milvus, and the app, (4) runs all tests: backend unit, stack connectivity, Playwright (using the app on port 3000), and the pipeline e2e (upload → vectorize → vector search). No separate “start stack then run tests” step. Requires Docker and `docker compose`.

**One command (script does not start the stack):**

```bash
mamba activate teleoscope   # or: source your env with python + pnpm
./scripts/run-all-tests.sh
```

This runs:

1. Backend unit tests  
2. Stack connectivity check (optional; warns if app/MongoDB/RabbitMQ are not up)  
3. Playwright e2e (Chromium by default; starts the app on 3099 if needed)

**Backend only:**

```bash
PYTHONPATH=. python -m pytest tests/ -m "not integration" -v
```

**With integration tests (needs MongoDB):**

```bash
PYTHONPATH=. python -m pytest tests/ -m integration -v
```

**E2E: upload → vectorize → vector search (full stack):**

Requires MongoDB, RabbitMQ, Milvus, and workers (dispatch, tasks, graph, vectorizer, uploader). Start the stack (e.g. `docker compose up -d` or `./scripts/start-local-stack.sh` with Milvus elsewhere), set `MONGODB_URI`, `MONGODB_DATABASE`, `RABBITMQ_*`, then:

```bash
PYTHONPATH=. python -m pytest tests/e2e/ -m e2e -v
```

This test publishes the same `chunk_upload` and `update_nodes` messages the API uses, waits for vectorization, triggers a Rank (vector) search, and asserts ranked results.

**Frontend e2e only:**

```bash
cd teleoscope.ca
pnpm exec playwright install chromium   # once
pnpm exec playwright test --project=chromium
```

**Frontend modular tests (Vitest + RTL):**

```bash
cd teleoscope.ca
pnpm test:unit
```

This suite currently includes focused modular tests for `UploadPage` chunking + importer completion behavior.

**API↔frontend contract consistency checks:**

```bash
cd teleoscope.ca
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
PLAYWRIGHT_SKIP_ACCOUNT=1 \
pnpm exec playwright test tests/api-frontend-contract.spec.ts tests/api.spec.ts -g "Frontend/API contract consistency|UI endpoint references resolve to backend routes" --project=chromium --retries=0
```

This verifies endpoint names and request-property naming/order alignment between frontend call sites and backend route handlers.

**System UI e2e bundle (chunked):**

Requires full stack (app + MongoDB + RabbitMQ + Milvus + vector workers).

```bash
docker compose up -d --build
./scripts/test-stack.sh http://localhost:3000
cd teleoscope.ca
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
PLAYWRIGHT_SKIP_ACCOUNT=1 \
PLAYWRIGHT_UI_COMPONENT_E2E=1 \
PLAYWRIGHT_UI_EXPORT_E2E=1 \
PLAYWRIGHT_UI_UPLOADER_E2E=1 \
pnpm exec playwright test tests/sidebar-components-e2e.spec.ts tests/export-buttons-ui.spec.ts tests/csv-uploader-ui.spec.ts tests/demo-public.spec.ts --project=chromium --retries=0
```

Expected signal: `6 passed` for core/demo specs above.

```bash
cd teleoscope.ca
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
PLAYWRIGHT_SKIP_ACCOUNT=1 \
PLAYWRIGHT_UI_VECTOR_E2E=1 \
PLAYWRIGHT_UI_VECTOR_DOC_COUNT=1000 \
PLAYWRIGHT_VECTOR_RESULT_TIMEOUT_MS=1200000 \
pnpm exec playwright test tests/ui-vectorization-large.spec.ts --project=chromium --retries=0
```

Expected signal: `1 passed` for the full 1000-doc vectorization spec.

**Public demo load test (concurrency smoke + optional 5000 stress):**

```bash
node scripts/load-test-demo.mjs http://localhost:3000 250 15
node scripts/load-test-demo.mjs http://localhost:3000 5000 30
```

The first command is CI-friendly smoke. The second is the conference stress target.

**One-click demo bootstrap + verification (Docker):**

```bash
./scripts/one-click-demo.sh
```

## Adding tests

- **Backend:** Add `tests/test_*.py` or `tests/test_<module>.py`. Use `@pytest.mark.integration` for tests that need MongoDB or other services. Keep the default suite fast and service-free.
- **Frontend:** Add `teleoscope.ca/tests/*.spec.ts`. Use `page.goto('/')` or relative URLs so the Playwright base URL (e.g. 3099) is used.

## CI workflow file

Primary merge-gate workflows:

- **`.github/workflows/test-suite.yml`**  
  - Runs on `push`/`pull_request` to `main`.  
  - Jobs: `backend` (unit), `frontend` (Playwright Chromium smoke).

- **`.github/workflows/test.playwright.yml`**  
  - Runs on `push`/`pull_request` to `main` and `frontend`, plus scheduled/manual full-vector runs.
  - Jobs:
    - `ui-core-e2e`
    - `ui-vectorization-full-e2e` (schedule/dispatch only)

If either required workflow fails, the branch should not merge.
