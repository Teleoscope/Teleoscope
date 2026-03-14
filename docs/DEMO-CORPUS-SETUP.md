# Demo corpus setup (anon users, no upload/vectorize)

The **/demo** route always uses a **pre-seeded** document corpus: anonymous users land in a workspace that shows real documents, search, and vector ranking without anyone uploading or vectorizing. Demo materials are **pre-vectorized** (documents + vectors come from teleoscope-demo-data); the seed script loads them into Mongo and Milvus and does **not** run the vectorization pipeline. For Docker, `./scripts/one-click-demo.sh` does the download and seed automatically; this doc covers how it works and how to run or re-run the steps manually (e.g. no Docker or re-seeding).

## Data source

The corpus comes from [Teleoscope/teleoscope-demo-data](https://github.com/Teleoscope/teleoscope-demo-data):

- **documents.jsonl.7z** — raw documents (title, text, etc.) in JSONL form.
- **parquet_export/** — pre-computed vectors (e.g. `part-*.parquet`) matching the JSONL order.

## Docker / one-click demo (automatic)

Run `./scripts/one-click-demo.sh`. It starts the stack, downloads the demo data (if missing), seeds the corpus into Mongo and Milvus, sets `DEMO_CORPUS_WORKSPACE_ID` in `.env`, and restarts the app. The demo at http://localhost:3000/demo then has the corpus. You need a mamba/conda env named `teleoscope` with `pyarrow` and `py7zr` on the host (see [environments/environment.yml](../environments/environment.yml)).

**Update only (no package or data download):** run `./scripts/refresh-demo-corpus.sh` when the stack and `data/` are already in place. It does not rebuild Docker images, run npm/pip, or download demo data; it only re-seeds Mongo/Milvus from existing data and restarts the app. Run `git pull` first if you want the latest code. For a **clean install** (rebuild all images with no cache and re-download demo data), run `CLEAN_INSTALL=1 ./scripts/one-click-demo.sh`.

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

If you get “prefix does not exist at …/mamba/envs/teleoscope” but the env exists under `~/.micromamba/envs/teleoscope`, add that path to `envs_dirs` in `~/.mambarc` so activation by name works (see [Troubleshooting](#troubleshooting) below).

(Run from the repo root so the backend is on `PYTHONPATH`.)

The script will:

- Create a dedicated **demo corpus** workspace in MongoDB (or reuse an existing one).
- Extract the 7z, insert all documents into the `documents` collection under that workspace.
- If Milvus is configured, load vectors from parquet into Milvus for that workspace (so ranking/similarity work).
- Print the workspace ID.

### 3. Point the app at the demo corpus

Set the printed workspace ID in your environment:

```bash
export DEMO_CORPUS_WORKSPACE_ID=<workspace_id_printed_by_script>
```

For the Next.js app you can use `.env.local`:

```bash
DEMO_CORPUS_WORKSPACE_ID=<workspace_id>
```

Then start the app. When anonymous users open `/demo`, they are redirected to a workspace whose **reads** (search, count, document fetch) and **vector operations** (when the backend is used) use this pre-seeded corpus. Uploads remain disabled for demo users.

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

4. Set `DEMO_CORPUS_WORKSPACE_ID` and start the frontend (`cd teleoscope.ca && pnpm dev`).

Result:

- **Document list, search, count, and opening documents** work (all from Mongo).
- **Ranking and similarity** (e.g. “move search vector toward selected docs”) require the backend and Milvus; they will not work until you run the seed (and app) against a stack that has Milvus, or use a remote backend.

So you can **prep and test** the corpus and UI without Docker; for full vector behavior, run the same seed script on a host that has Mongo + Milvus (e.g. Docker) and point the app at that backend.

## Full stack (Docker) — manual

For automatic Docker demo use `./scripts/one-click-demo.sh` (it does the steps below for you). If you prefer to run the stack and seed manually (e.g. without mamba on the host):

With Docker (Mongo + Milvus + workers):

1. `./scripts/download-demo-data.sh`
2. `docker compose up -d` (or ensure Mongo + Milvus are up).
3. `MILVUS_URI=http://localhost:19530 PYTHONPATH=. python scripts/seed-demo-corpus.py`  
   (Adjust host/port if Milvus is elsewhere; e.g. `docker compose port milvus 19530`.)
4. Set `DEMO_CORPUS_WORKSPACE_ID` in `.env` / environment and start the app.

Then anonymous demo users get both document list/search and vector ranking/similarity from the pre-seeded corpus.

## Re-seeding

Running `seed-demo-corpus.py` again **reuses** the same demo workspace: it deletes existing documents in that workspace and re-inserts from the 7z. If parquet is present and Milvus is configured, vectors are re-loaded. So you can refresh the corpus by re-running the script after re-downloading or replacing the data.

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

Run `./scripts/demo-status.sh [base_url]` to check: demo workspace ID (in .env), demo data files, Mongo document count and text index for the demo workspace, app health, and Docker services. Default base_url is http://localhost:3000.

## Env reference

| Variable | Purpose |
|--------|----------|
| `DEMO_CORPUS_WORKSPACE_ID` | Workspace ID for demo reads/vector ops (set by one-click-demo.sh or after running seed-demo-corpus.py). |
| `TELEOSCOPE_DATA_DIR` | Directory containing `documents.jsonl.7z` and `parquet_export/` (default: repo `data/`). |
| `MONGODB_URI` / `MONGODB_DATABASE` | Mongo connection for the seed script and app. |
| `MILVUS_URI` or `MILVUS_LITE_PATH` | When set, seed script loads vectors from parquet into Milvus. |
