# Testing Teleoscope on This Machine (No Docker)

Use this when you can’t run Docker (e.g. macOS in UTM with hypervisor limits). Everything runs natively with Homebrew and your existing mamba/Node setup.

## One-click: stack + all tests (no Docker)

```bash
./scripts/one-click-test-no-docker.sh
```

This single command (1) ensures `.env` exists and is set for local (localhost + `MILVUS_LITE_PATH` for Milvus Lite), (2) starts MongoDB and RabbitMQ via Homebrew, (3) starts the **full stack** on this machine (app, dispatch, tasks, files, **vectorizer, uploader, graph**) using **Milvus Lite** (file-based, no Milvus server), (4) waits for the app, (5) runs all tests including pipeline e2e (upload → vectorize → vector search). No Docker required.

Prerequisites: run `./scripts/setup-local-macos.sh` once (installs MongoDB + RabbitMQ, creates `.env`). Then Python (e.g. `mamba activate teleoscope`) and Node/pnpm must be on your PATH.

**If `brew services start mongodb-community` fails** (e.g. launchctl "Input/output error" or "other" status), start MongoDB manually in another terminal and leave it running, then run the one-click script again:

```bash
mongod --config $(brew --prefix)/etc/mongod.conf
```

RabbitMQ can stay managed by `brew services`; only MongoDB may need this workaround.

## What runs without Docker

| Component        | How                | Notes                    |
|-----------------|--------------------|--------------------------|
| MongoDB         | Homebrew           | `brew install mongodb-community` |
| RabbitMQ        | Homebrew           | `brew install rabbitmq`  |
| App (Next.js)   | pnpm               | teleoscope.ca            |
| Dispatch        | Python             | Routes tasks to Celery   |
| Tasks worker    | Celery             | Document/export tasks    |
| Files API       | Gunicorn/FastAPI   | Port 8000                |
| Vectorizer      | Python             | When `MILVUS_LITE_PATH` set (Milvus Lite) |
| Uploader        | Python             | When `MILVUS_LITE_PATH` set (Milvus Lite) |
| Graph           | Celery             | When `MILVUS_LITE_PATH` set (Milvus Lite) |
| Milvus          | Milvus Lite (file) | Set `MILVUS_LITE_PATH=./.milvus_lite_test` in `.env` |

With `MILVUS_LITE_PATH` set to a file path, the **full pipeline** (vectorization, vector search, clustering) runs on this machine without Docker.

---

## One-time setup

1. **Install services (Homebrew)**

   ```bash
   brew tap mongodb/brew
   brew install mongodb-community rabbitmq
   brew services start mongodb-community
   brew services start rabbitmq
   ```

   If `rabbitmqctl` isn’t in your PATH:

   ```bash
   export PATH="$PATH:$(brew --prefix)/opt/rabbitmq/sbin"
   ```

2. **Project env and app deps**

   ```bash
   cd /path/to/Teleoscope
   ./scripts/setup-local-macos.sh
   cp .env.local.example .env
   # Edit .env: set MONGODB_HOST=localhost, RABBITMQ_HOST=localhost, MONGODB_URI=mongodb://localhost:27017/...
   ```

   For the Next.js app:

   ```bash
   mamba activate teleoscope
   cd teleoscope.ca && pnpm install && pnpm schema
   cp ../.env .env.local
   ```

3. **Backend Python deps (mamba)**

   ```bash
   mamba activate teleoscope
   pip install -r requirements-test.txt
   # Optional, for full backend (no torch/FlagEmbedding): pip install -r backend/requirements.txt
   ```

---

## Run the stack (no Docker)

Start infra (if not already running):

```bash
brew services start mongodb-community rabbitmq
```

Start the app and workers on this machine:

```bash
mamba activate teleoscope
./scripts/start-local-stack.sh
```

Then open **http://localhost:3000** and use the app. The script always starts: Celery tasks worker, dispatch, files API, and the Next.js app. If `MILVUS_LITE_PATH` is set, it also starts vectorizer, uploader, and graph worker (full vector pipeline via Milvus Lite).

---

## Test plan on this machine

### 1. Unit tests (no services)

```bash
mamba activate teleoscope
# Backend
PYTHONPATH=. pytest tests/ -m "not integration" -v

# Frontend
cd teleoscope.ca && pnpm test:run
```

### 2. Integration / connectivity (stack must be running)

With the local stack running (`./scripts/start-local-stack.sh`):

```bash
./scripts/test-stack.sh
```

This checks: app `/api/hello`, RabbitMQ management, files API, MongoDB and (if present) Milvus ports.

### 3. E2E (Playwright)

With the local stack running and the app at http://localhost:3000, run smoke tests:

```bash
cd teleoscope.ca
PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm exec playwright test --project=chromium
```

Run the large vector UI e2e (1000 docs):

```bash
cd teleoscope.ca
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
PLAYWRIGHT_SKIP_ACCOUNT=1 \
PLAYWRIGHT_UI_VECTOR_E2E=1 \
pnpm exec playwright test tests/ui-vectorization-large.spec.ts --project=chromium --retries=0
```

The large test requires `MILVUS_LITE_PATH` plus vector workers (or Docker Milvus/stack).

### 4. What’s not tested without Docker

- Anything that depends on external container networking/features not reproduced locally.
- Vector/search flows **only** when `MILVUS_LITE_PATH` is not configured.

If `MILVUS_LITE_PATH` is configured, vectorization/search/ranking flows can be validated locally too.

---

## Summary

| Test type        | Command / action                          | Needs stack? |
|------------------|--------------------------------------------|--------------|
| Backend unit     | `PYTHONPATH=. pytest tests/ -m "not integration"` | No           |
| Frontend unit    | `cd teleoscope.ca && pnpm test:run`        | No           |
| Connectivity     | `./scripts/test-stack.sh`                  | Yes          |
| E2E (smoke)      | `cd teleoscope.ca && PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm exec playwright test --project=chromium` | Yes |
| E2E (vector, 1000 docs) | `cd teleoscope.ca && PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_SKIP_ACCOUNT=1 PLAYWRIGHT_UI_VECTOR_E2E=1 pnpm exec playwright test tests/ui-vectorization-large.spec.ts --project=chromium --retries=0` | Yes + Milvus Lite |

With `MILVUS_LITE_PATH` configured, this machine can run both smoke and vector UI e2e coverage without Docker.
