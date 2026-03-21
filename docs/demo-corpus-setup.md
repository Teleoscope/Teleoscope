# Demo corpus setup (anon users, no upload/vectorize)

The **/demo** route always uses a **pre-seeded** document corpus: anonymous users land in a workspace that shows real documents, search, and vector ranking without anyone uploading or vectorizing. Demo materials are **pre-vectorized** (documents + vectors come from teleoscope-demo-data); the seed script loads them into Mongo and Milvus and does **not** run the vectorization pipeline. For Docker, `./scripts/one-click-demo.sh` does the download and seed automatically; this doc covers how it works and how to run or re-run the steps manually (e.g. no Docker or re-seeding).

**Production:** `scripts/seed-demo-corpus.py` is **only** for demo-capable environments (local, CI, staging, or a host dedicated to `/demo`). It must **not** be run against a **production** database once real workspaces and documents matter—the default path **drops the entire `documents` collection** and is destructive by design.

## Data source

The corpus comes from [Teleoscope/teleoscope-demo-data](https://github.com/Teleoscope/teleoscope-demo-data):

- **documents.jsonl.7z** — raw documents (title, text, etc.) in JSONL form.
- **parquet_export/** — pre-computed vectors (e.g. `part-*.parquet`) matching the JSONL order.

## Docker / one-click demo (automatic)

Run `./scripts/one-click-demo.sh`. It starts the stack, downloads the demo data (if missing), seeds the corpus into Mongo and Milvus, and restarts the app. The app **auto-discovers** the demo corpus by finding the workspace with label "Demo corpus" in Mongo (same label the seed script uses), so you do not need to set `DEMO_CORPUS_WORKSPACE_ID`; one-click may still write it to `.env` when the seed prints an ID (avoids a one-time DB lookup). The demo at http://localhost:3000/demo then has the corpus. You need a mamba/conda env named `teleoscope` with `pyarrow` and `py7zr` on the host (see [environments/environment.yml](../environments/environment.yml)).

**Update only (no package or data download):** run `./scripts/refresh-demo-corpus.sh` when the stack and `data/` are already in place. It does not rebuild Docker images, run npm/pip, or download demo data. It runs **`seed-demo-corpus.py` with full console output** (so you can see Milvus upsert batches and `Milvus seed done`), then **`demo-status.sh`** with **`DEMO_STATUS_SKIP_APP=1`** to print **Mongo demo document count vs Milvus partition row count** before recreating the app container (`VERIFY_REFRESH=0` skips that check). Run `git pull` first if you want the latest code. For a **clean install** (rebuild all images with no cache and re-download demo data), run `CLEAN_INSTALL=1 ./scripts/one-click-demo.sh`.

## Manual setup (no Docker or re-seeding)

### 1. Download demo data

From the repo root:

```bash
./scripts/download-demo-data.sh
```

This puts `documents.jsonl.7z` and `parquet_export/` (or `parquet_export/full/`) under `data/`.

### 2. Seed the demo corpus

Use the project’s mamba/conda environment (it includes `pyarrow` and `py7zr` for 7z and parquet):

```bash
mamba activate teleoscope   # or: conda activate teleoscope
PYTHONPATH=. python scripts/seed-demo-corpus.py
```

If `documents.jsonl.7z` and `documents.jsonl` are both missing under `data/` (or `TELEOSCOPE_DATA_DIR`), the seed script **runs `scripts/download-demo-data.sh` for you**—that shallow-clones [Teleoscope/teleoscope-demo-data](https://github.com/Teleoscope/teleoscope-demo-data) and copies files into your data directory (same as one-click demo). If **`MILVUS_URI`** or **`MILVUS_LITE_PATH`** is set, the same logic applies when **`parquet_export/part-*.parquet`** is missing (vectors are required for Milvus seed). You need **git** and **bash** on `PATH`. Use **`--download`** / **`SEED_DOWNLOAD_DEMO_DATA=1`** to re-fetch from GitHub even when files already exist; use **`--no-download`** / **`SEED_NO_DOWNLOAD=1`** if the machine is air-gapped and you stage `data/` yourself.

You can still run `./scripts/download-demo-data.sh` alone first; it is optional if you rely on the automatic fetch.

If you get “prefix does not exist at …/mamba/envs/teleoscope” but the env exists under `~/.micromamba/envs/teleoscope`, add that path to `envs_dirs` in `~/.mambarc` so activation by name works (see [Troubleshooting](#troubleshooting) below).

Run from the **repo root**. **`mamba activate teleoscope`** picks the interpreter and installed deps; **`PYTHONPATH=.`** adds the repo root so `import backend` works.

The script will:

- Ensure demo files exist (clone **teleoscope-demo-data** when needed; see above).
- Create a dedicated **demo corpus** workspace in MongoDB (or reuse an existing one).
- Extract the 7z, insert all documents into the `documents` collection under that workspace.
- If Milvus is configured, load vectors from parquet into Milvus for that workspace (so ranking/similarity work).
- Print the workspace ID.

### 3. (Optional) Set the demo corpus workspace ID

The app **auto-discovers** the demo corpus by querying Mongo for the workspace with label "Demo corpus" (the same label the seed script uses). You do not need to set `DEMO_CORPUS_WORKSPACE_ID`. If you want to avoid that one-time DB lookup, set the printed workspace ID:

```bash
export DEMO_CORPUS_WORKSPACE_ID=<workspace_id_printed_by_script>
```

For the Next.js app you can use `.env` or `.env.local`:

```bash
DEMO_CORPUS_WORKSPACE_ID=<workspace_id>
```

Then start the app. When anonymous users open `/demo`, they are redirected to that workspace; **reads** (search, count, document fetch) and **vector operations** use the pre-seeded corpus. Uploads remain disabled for demo users.

## No-Docker (Mongo only)

If this machine **cannot run Docker** (no Milvus, no RabbitMQ/Celery):

1. Run **MongoDB** locally (e.g. `brew install mongodb-community` and start it).
2. Set `MONGODB_URI` (and optionally `MONGODB_DATABASE`) so the app and seed script use that instance.
3. Run the download script, then the seed script **without** Milvus env vars (use the mamba env so pyarrow/py7zr are available):

   ```bash
   ./scripts/download-demo-data.sh
   mamba activate teleoscope   # or: micromamba activate teleoscope
   PYTHONPATH=. python scripts/seed-demo-corpus.py
   ```

   You’ll see: “MILVUS_URI and MILVUS_LITE_PATH unset; skipping Milvus”.

4. (Optional) Set `DEMO_CORPUS_WORKSPACE_ID`; the app will otherwise auto-discover the corpus by label. Start the frontend (`cd teleoscope.ca && pnpm dev`).

Result:

- **Document list, search, count, and opening documents** work (all from Mongo).
- **Ranking and similarity** (e.g. “move search vector toward selected docs”) require the backend and Milvus; they will not work until you run the seed (and app) against a stack that has Milvus, or use a remote backend.

So you can **prep and test** the corpus and UI without Docker; for full vector behavior, run the same seed script on a host that has Mongo + Milvus (e.g. Docker) and point the app at that backend.

## Full stack (Docker) — manual

For automatic Docker demo use `./scripts/one-click-demo.sh` (it does the steps below for you). If you prefer to run the stack and seed manually:

With Docker (Mongo + Milvus + workers):

1. `./scripts/download-demo-data.sh`
2. `docker compose up -d` (or ensure Mongo + Milvus are up).
3. From the repo root, with the **`teleoscope`** mamba env and `PYTHONPATH` set:

   ```bash
   mamba activate teleoscope
   export MILVUS_URI=http://127.0.0.1:$(docker compose port milvus 19530 | cut -d: -f2)
   PYTHONPATH=. python scripts/seed-demo-corpus.py
   ```

   (Adjust `MILVUS_URI` if Milvus is not on localhost.) If you cannot use mamba, use another env with `pip install -r backend/requirements.txt` plus `pyarrow` / `py7zr` for the seed script, still from the repo root with `PYTHONPATH=.`.
4. (Optional) Set `DEMO_CORPUS_WORKSPACE_ID` in `.env`; the app auto-discovers the corpus by label if unset. Start the app.

Then anonymous demo users get both document list/search and vector ranking/similarity from the pre-seeded corpus.

## Re-seeding

Running `seed-demo-corpus.py` again **reuses** the same demo workspace (same team/workspace/workflow ObjectIds). By default it **drops the entire MongoDB `documents` collection** and recreates it, then inserts only the demo corpus. That removes all rows and indexes in one step (no per-document delete churn), then adds a single full-text index **after** bulk insert. If parquet is present and Milvus is configured, vectors are re-loaded for the demo workspace.

**Other workspaces’ documents are deleted** by this default path. If you share one MongoDB with non-demo workspaces and must keep their documents, use **`--workspace-documents-only`** (or **`SEED_WORKSPACE_DOCUMENTS_ONLY=1`**): only documents with the demo workspace id are removed and re-inserted. That path is slower on large corpora; by default the script drops the shared text index during that bulk load and rebuilds it at the end—use **`--keep-text-index`** / **`SEED_KEEP_TEXT_INDEX=1`** only if you accept slower writes.

### Why batched inserts still log

`insert_many` runs in chunks for progress logging and to avoid huge single payloads. Index work for the text index happens **after** all inserts when using the default **drop collection** path, not once per batch.

### Milvus only (leave Mongo as-is)

To reload **vectors from parquet** without touching Mongo (no 7z read, no document delete/insert):

```bash
mamba activate teleoscope
export MILVUS_URI=http://127.0.0.1:$(docker compose port milvus 19530 | cut -d: -f2)
PYTHONPATH=. python scripts/seed-demo-corpus.py --milvus-only
```

Requirements: demo workspace already exists (label **Demo corpus**, or set **`DEMO_CORPUS_WORKSPACE_ID`**); **`data/parquet_export/`** with `part-*.parquet`; Mongo document count for that workspace must **equal** the number of parquet rows, in the same order as after a full seed (script matches by sorting Mongo documents by **`_id`**). If you changed the workspace document set, run a **full** seed instead.

Shell shortcut: **`MILVUS_ONLY=1 ./scripts/refresh-demo-corpus.sh`** (skips the 7z precondition; still restarts the app at the end).

## Troubleshooting

**“Cannot activate, prefix does not exist at …/mamba/envs/teleoscope”** — Your `teleoscope` env lives under `~/.micromamba/envs/` while mamba is only looking in `~/.local/share/mamba/envs`. Add the micromamba envs directory to your config:

```yaml
# ~/.mambarc (create or edit)
envs_dirs:
  - /Users/codebot/.local/share/mamba/envs
  - /Users/codebot/.micromamba/envs
```

(Use your actual home path if different.) Then `mamba activate teleoscope` will find the env. Alternatively, activate by path: `mamba activate /Users/codebot/.micromamba/envs/teleoscope`.

## Verifying status

Run `./scripts/demo-status.sh [-v|--verbose] [base_url]` to check: demo workspace ID (in .env), demo data files under **`TELEOSCOPE_DATA_DIR`** (default `data/`), including parquet under `parquet_export/full` or `parquet_export` (same as the seed script), Mongo document count and text index for the demo workspace, Milvus alignment when **`MILVUS_URI`** or **`MILVUS_LITE_PATH`** is set, app health, and Docker services. Use **`-v`** or **`DEMO_STATUS_VERBOSE=1`** for extra detail (sizes, URIs with credentials redacted, index list, Docker ports, `/api/hello` timing). Default base_url is http://localhost:3000.

## Milvus: why there is no database literally named `teleoscope` (Docker / standalone)

Milvus has **databases** (like Postgres schemas) and **collections** (where vectors live). In `.env`, **`MILVUS_DBNAME`** is used by **`backend.embeddings.connect()`** as the *Milvus database* name when the server supports multi-DB.

**Docker Compose uses Milvus 2.6.x standalone** (see `docker-compose.yml`), which in some setups may **not** implement `DescribeDatabase` / `using_database` the way multi-DB clusters do. The app then keeps everything in Milvus’s built-in **`default`** database. The **collection** that holds vectors is still named **`teleoscope`** (or **`MILVUS_COLLECTION`** if you set it). So one-click / `refresh-demo-corpus` / `seed-demo-corpus.py` **did** write vectors into the **`teleoscope` collection**; they are not missing — they sit under the **default** Milvus DB, not a DB named `teleoscope`.

On **Zilliz** or newer Milvus, a database named `teleoscope` may exist if the server supports it and `create_database` ran successfully.

## Env reference

| Variable | Purpose |
|--------|----------|
| `DEMO_CORPUS_WORKSPACE_ID` | Optional. When set, app uses this workspace for demo reads/vector ops; when unset, app auto-discovers the workspace by label "Demo corpus" in Mongo. One-click and seed script may set it. |
| `TELEOSCOPE_DATA_DIR` | Directory containing `documents.jsonl.7z` and `parquet_export/` (default: repo `data/`). |
| `MONGODB_URI` / `MONGODB_DATABASE` | Mongo connection for the seed script and app. |
| `MILVUS_URI` or `MILVUS_LITE_PATH` | When set, seed script loads vectors from parquet into Milvus. |
| `MILVUS_COLLECTION` | Milvus **collection** name for seed/export/import (default: `teleoscope`). Prefer this over overloading `MILVUS_DBNAME`. |
| `MILVUS_DBNAME` | Used as Milvus **database** for `connect()` when supported; seed historically also used it as collection name — use `MILVUS_COLLECTION` for clarity. |
| `MILVUS_DATABASE` | Optional override for export/import **database** selection (see `docs/zilliz-migration.md`). |
