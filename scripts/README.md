# Scripts directory guide

Operational and helper scripts for local setup, validation, and demos.

## Frequently used scripts

- `test-stack.sh`: quick stack connectivity check.
- `run-all-tests.sh`: aggregate test runner.
- `one-click-test.sh`: Docker stack + test flow.
- `one-click-test-no-docker.sh`: local non-Docker test flow.
- `start-local-stack.sh`: local service startup helper.
- `one-click-demo.sh`: **Full demo bootstrap**: starts stack (`docker compose up -d --build`), downloads demo data if missing, seeds corpus, sets `DEMO_CORPUS_WORKSPACE_ID`, restarts app. Uses Docker cache so re-runs do not re-download all packages. Optional **clean install** (rebuild images with no cache + re-download demo data): `CLEAN_INSTALL=1 ./scripts/one-click-demo.sh`. Requires mamba env `teleoscope` on host.
- `refresh-demo-corpus.sh`: **Update only** (no packages, no data download): re-seeds from existing `data/`, updates `.env`, restarts app. Does not rebuild images, run npm/pip, or download demo data. Run after `git pull` if you want latest code. Use when stack and data are already in place.
- `load-test-demo.mjs`: demo API concurrency/load test helper.
- `seed-test-data.py`: test account/workspace seed script.
- `download-demo-data.sh`: fetch [teleoscope-demo-data](https://github.com/Teleoscope/teleoscope-demo-data) into `data/` (e.g. `documents.jsonl.7z`, `parquet_export/`). Run from repo root or pass data dir: `./scripts/download-demo-data.sh` or `./scripts/download-demo-data.sh /path/to/data`.
- `seed-demo-corpus.py`: after downloading demo data, seeds a **demo corpus workspace** from `data/documents.jsonl.7z` (and optionally vectors from `data/parquet_export/`) into MongoDB (and Milvus if configured). Print the workspace ID to set as `DEMO_CORPUS_WORKSPACE_ID` so anonymous demo users see this corpus without uploading. Mongo-only mode works without Docker (document list/search only); with Milvus, ranking/similarity work. Use the mamba env (`mamba activate teleoscope`) then `PYTHONPATH=. python scripts/seed-demo-corpus.py`. See `docs/DEMO-CORPUS-SETUP.md`.

## Notes

- Keep scripts idempotent when possible.
- Add or update script docs in this file when introducing new scripts.
