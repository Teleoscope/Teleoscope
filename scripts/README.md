# Scripts directory guide

Operational and helper scripts for local setup, validation, and demos.

## Frequently used scripts

- `test-stack.sh`: quick stack connectivity check.
- `run-all-tests.sh`: aggregate test runner.
- `one-click-test.sh`: Docker stack + test flow.
- `one-click-test-no-docker.sh`: local non-Docker test flow.
- `start-local-stack.sh`: local service startup helper.
- `one-click-demo.sh`: **Full demo bootstrap**: starts stack (`docker compose up -d --build`), downloads demo data if missing, seeds corpus, restarts app. The app **auto-discovers** the demo corpus by workspace label "Demo corpus" in Mongo; one-click may write `DEMO_CORPUS_WORKSPACE_ID` to `.env` when the seed prints an ID (optional). Optional **clean install** (rebuild images with no cache + re-download demo data): `CLEAN_INSTALL=1 ./scripts/one-click-demo.sh`. Requires mamba env `teleoscope` on host.
- `demo-status.sh`: **CLI monitor** — run `./scripts/demo-status.sh [-v|--verbose] [base_url]` to verify demo workspace ID, demo data files (honors **`TELEOSCOPE_DATA_DIR`**, same parquet paths as **`seed-demo-corpus.py`**: `parquet_export/full` then `parquet_export`), Mongo document count and text index, Milvus partition vs **`MILVUS_URI`/`MILVUS_LITE_PATH`**, app health, and Docker services. Missing parquet is reported as **fail** when Milvus env is set. **`DEMO_STATUS_VERBOSE=1`** or **`-v`** adds paths, file sizes, redacted Mongo/Milvus URIs, index names, Docker ports column, and timings. Default base_url is http://localhost:3000.
- `refresh-demo-corpus.sh`: **Update only** (no packages, no data download): runs **`seed-demo-corpus.py` in the foreground** (full seed log including Milvus upserts), then **`demo-status.sh`** with **`DEMO_STATUS_SKIP_APP=1`** so Mongo vs Milvus row counts print before the app container is recreated; updates `.env`; restarts app. **`VERIFY_REFRESH=0`** skips the status pass; **`REFRESH_VERBOSE=1`** passes **`-v`** to demo-status. Does not rebuild images, run npm/pip, or download demo data. Run after `git pull` if you want latest code.
- `load-test-demo.mjs`: demo API concurrency/load test helper.
- `seed-test-data.py`: test account/workspace seed script.
- `download-demo-data.sh`: fetch [teleoscope-demo-data](https://github.com/Teleoscope/teleoscope-demo-data) into `data/` (e.g. `documents.jsonl.7z`, `parquet_export/`). Run from repo root or pass data dir: `./scripts/download-demo-data.sh` or `./scripts/download-demo-data.sh /path/to/data`.
- `milvus-status.py`: **Milvus debug** — collections, partitions, `row_count` via `get_partition_stats`, optional `describe_collection` / `load_state` (same env as workers: `MILVUS_URI`, `MILVUS_HOST`/`MIVLUS_PORT`, `MILVUS_LITE_PATH`, `MILVUS_COLLECTION`, …). `mamba activate teleoscope` then `PYTHONPATH=. python scripts/milvus-status.py` (`--json`, `--all-collections`, `--collection NAME`, `--workspace <partition>`). For Mongo + app + demo alignment, use `demo-status.sh`.
- `demo_7z_jsonl.py`: internal helper used by **`seed-demo-corpus.py`** to read `*.jsonl` from `.7z` via **`SevenZipFile.extract(..., targets=...)`** (py7zr **1.x** removed `read`/`readall`). Covered by **`tests/test_demo_7z_jsonl.py`** (`py7zr` in **`requirements-test.txt`**).
- `seed-demo-corpus.py`: **demo/staging/local only — not for production** after go-live. Uses **`tqdm`** on stderr for long steps (Mongo batches, parquet row read, Milvus upserts) when a TTY; **`--no-progress`** or **`SEED_NO_PROGRESS=1`** restores plain per-batch logs (e.g. for CI logs). Seeds a **demo corpus workspace** (label "Demo corpus") from `data/documents.jsonl.7z` (or `documents.jsonl`) and optionally vectors from `data/parquet_export/` into MongoDB (and Milvus if configured). If those files are missing, it runs **`download-demo-data.sh`** (shallow clone [teleoscope-demo-data](https://github.com/Teleoscope/teleoscope-demo-data)); **`--download`** forces a re-fetch, **`--no-download`** disables fetch (air-gapped). Requires **git** and **bash** when fetching. The app auto-discovers this workspace by label, so `DEMO_CORPUS_WORKSPACE_ID` is optional. **Default:** drops the entire Mongo **`documents`** collection and recreates it (fast re-seed; **wipes all workspaces’ documents**—use **`--workspace-documents-only`** / `SEED_WORKSPACE_DOCUMENTS_ONLY=1` to keep other workspaces). **`--milvus-only`** reloads vectors from parquet into Milvus without changing Mongo (auto-fetches demo data if parquet is missing; requires doc count = parquet rows, `_id` order). Mongo-only mode works without Docker (document list/search only); with Milvus, ranking/similarity work. Use the mamba env (`mamba activate teleoscope`) then `PYTHONPATH=. python scripts/seed-demo-corpus.py`. See `docs/demo-corpus-setup.md`. For refresh without 7z: `MILVUS_ONLY=1 ./scripts/refresh-demo-corpus.sh`.

## Notes

- Keep scripts idempotent when possible.
- Add or update script docs in this file when introducing new scripts.
