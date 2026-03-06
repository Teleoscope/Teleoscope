# Test suite

The test suite is **automated** and runs on every push and pull request to `main`. It is the guarantee that the system runs and that code changes are valid.

## What runs in CI

- **Backend (unit)**  
  - `pytest tests/ -m "not integration"`  
  - No MongoDB, RabbitMQ, or Milvus required.  
  - Covers: schema loading, `backend.utils` (sanitization, ranking, similarity), `backend.projection` (distance matrices, clustering helpers).

- **Frontend (e2e)**  
  - Playwright with Chromium only.  
  - Starts the Next.js app via the Playwright webServer (port 3099).  
  - Runs: landing page, smoke tests. Account/signup tests are skipped in CI unless `MONGODB_ATLAS_TESTING_URI` is set in repo secrets.

**Required status:** Protect `main` with a branch rule that requires the **“Test suite”** workflow to pass before merge. Then changes cannot be merged if tests fail.

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

## Adding tests

- **Backend:** Add `tests/test_*.py` or `tests/test_<module>.py`. Use `@pytest.mark.integration` for tests that need MongoDB or other services. Keep the default suite fast and service-free.
- **Frontend:** Add `teleoscope.ca/tests/*.spec.ts`. Use `page.goto('/')` or relative URLs so the Playwright base URL (e.g. 3099) is used.

## CI workflow file

The single workflow that defines the gate is:

**`.github/workflows/test-suite.yml`**

- Runs on `push` and `pull_request` to `main`.
- Jobs: `backend` (unit), `frontend` (Playwright Chromium).
- No optional steps: if either job fails, the suite fails.

Other workflows (e.g. `python.lint.and.test.yml`, `test.playwright.yml`) can remain for branch-specific or full-browser runs, but **Test suite** is the one to require for merge.
