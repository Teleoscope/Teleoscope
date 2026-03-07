# Agents Instructions

## Cursor Cloud specific instructions

### Architecture Overview

Teleoscope is a qualitative research platform with a Next.js 14 frontend (`teleoscope.ca/`), Python Celery backend (`backend/`), and infrastructure services (MongoDB, RabbitMQ, Milvus). See `README.md` for full details.

### Running Services

**Infrastructure** (Docker): MongoDB (replica set, port 27017), RabbitMQ (5672/15672), Milvus + etcd + MinIO (19530).

MongoDB **must** run as a single-node replica set because the app uses MongoDB transactions for account creation. Start it with:

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

For RabbitMQ and Milvus, use `docker compose up -d rabbitmq etcd minio milvus` from the repo root.

**Frontend dev server**: `cd teleoscope.ca && pnpm dev` (port 3000). Requires `.env.local` with correct MongoDB URI including `/teleoscope` database path and `authSource=admin`.

### Key Gotchas

- **MongoDB URI must include database name**: The URI path must be `/teleoscope` (e.g. `mongodb://teleoscope:pass@localhost:27017/teleoscope?...&authSource=admin`). Without it, `mongo_client.db()` defaults to the wrong database.
- **Stripe is optional for local dev**: `STRIPE_TEST_SECRET_KEY` is not needed. The code gracefully skips Stripe integration when the key is absent.
- **`pymongo>=6.0.0` in `backend/requirements.txt` does not exist on PyPI**: Install `pymongo>=4.0.0` instead. The test suite and backend work fine with pymongo 4.x.
- **`hdbscan` requires `python3-dev` and `build-essential`** to compile from source.
- **Schema generation**: Run `python loadschemas.py` in `teleoscope.ca/` to generate `src/schemas/*.json` and `src/types/*.ts` from `schemas/*.yaml`. This requires `pyyaml`. The `pnpm schema` script calls this.
- **pnpm install with `--ignore-scripts`** is safe; `sharp` and other native deps have prebuilt binaries. Do not add `pnpm.onlyBuiltDependencies` to `package.json` as it regenerates the lockfile.

### Common Commands

| Task | Command |
|------|---------|
| **Lint** | `cd teleoscope.ca && pnpm lint` |
| **Backend unit tests** | `PYTHONPATH=. python -m pytest tests/ -m "not integration and not e2e" -v` |
| **Playwright e2e** | `cd teleoscope.ca && PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_SKIP_ACCOUNT=1 pnpm exec playwright test --project=chromium` |
| **Dev server** | `cd teleoscope.ca && pnpm dev` |
| **Full test suite** | See `TESTING.md` |
