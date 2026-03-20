# Scripts directory guide

Operational and helper scripts for local setup, validation, and demos.

## Frequently used scripts

- `test-stack.sh`: quick stack connectivity check.
- `run-all-tests.sh`: aggregate test runner.
- `one-click-test.sh`: Docker stack + test flow.
- `one-click-test-no-docker.sh`: local non-Docker test flow.
- `start-local-stack.sh`: local service startup helper.
- `one-click-demo.sh`: **Full demo bootstrap**: starts stack (`docker compose up -d --build`), downloads demo data if missing, seeds corpus, restarts app. The app **auto-discovers** the demo corpus by workspace label "Demo corpus" in Mongo; one-click may write `DEMO_CORPUS_WORKSPACE_ID` to `.env` when the seed prints an ID (optional). Optional **clean install** (rebuild images with no cache + re-download demo data): `CLEAN_INSTALL=1 ./scripts/one-click-demo.sh`. Requires mamba env `teleoscope` on host.
- `demo-status.sh`: **CLI monitor** — run `./scripts/demo-status.sh [base_url]` to verify demo workspace ID, demo data files, Mongo document count and text index, app health, and Docker services. Default base_url is http://localhost:3000.
- `refresh-demo-corpus.sh`: **Update only** (no packages, no data download): re-seeds from existing `data/`, updates `.env`, restarts app. Does not rebuild images, run npm/pip, or download demo data. Run after `git pull` if you want latest code. Use when stack and data are already in place.
- `load-test-demo.mjs`: demo API concurrency/load test helper.
- `seed-test-data.py`: test account/workspace seed script.
- `download-demo-data.sh`: fetch [teleoscope-demo-data](https://github.com/Teleoscope/teleoscope-demo-data) into `data/` (e.g. `documents.jsonl.7z`, `parquet_export/`). Run from repo root or pass data dir: `./scripts/download-demo-data.sh` or `./scripts/download-demo-data.sh /path/to/data`.
- `seed-demo-corpus.py`: after downloading demo data, seeds a **demo corpus workspace** (label "Demo corpus") from `data/documents.jsonl.7z` and optionally vectors from `data/parquet_export/` into MongoDB (and Milvus if configured). The app auto-discovers this workspace by label, so `DEMO_CORPUS_WORKSPACE_ID` is optional. **`--milvus-only`** reloads vectors from parquet into Milvus without changing Mongo (requires doc count = parquet rows, `_id` order). Mongo-only mode works without Docker (document list/search only); with Milvus, ranking/similarity work. Use the mamba env (`mamba activate teleoscope`) then `PYTHONPATH=. python scripts/seed-demo-corpus.py`. See `docs/demo-corpus-setup.md`. For refresh without 7z: `MILVUS_ONLY=1 ./scripts/refresh-demo-corpus.sh`.

## Notes

- Keep scripts idempotent when possible.
- Add or update script docs in this file when introducing new scripts.
