# Moving from Docker Milvus to Zilliz Cloud

Zilliz Cloud is managed Milvus. Teleoscope talks to it with **`pymilvus`** using the same collection layout (collection `teleoscope` by default, partitions per workspace, `id` + `vector` dim 1024).

## Prerequisites

- A **Zilliz Cloud** cluster (pick a Milvus version compatible with your workload; self-hosted in this repo tracks **2.6.x** with the `docker-compose.yml` image and `pymilvus` in `backend/requirements.txt`).
- From the Zilliz console: **Public endpoint** (URI) and **token** (API key / `user:password` string — copy exactly what the “Connect” panel shows).
- **Python:** use the project **mamba** env (`mamba activate teleoscope` after `mamba env create -f environments/environment.yml`) so `pymilvus` and other deps match the repo. From the **repo root**, set **`PYTHONPATH=.`** so `import backend` works (same pattern as `scripts/seed-demo-corpus.py`).

Runtime code uses **`backend.embeddings.connect()`**, which honors (in order):

1. **`MILVUS_LITE_PATH`** — local file (skip for Zilliz).
2. **`MILVUS_URI`** — e.g. `https://in01-xxxxxxxx.vectordb.zillizcloud.com:19536` (use the exact host and port from the Zilliz Connect panel; recent deployments may use ports like **19536**, while older examples used **443** or **19530**).
3. Otherwise **`MILVUS_HOST`** + **`MIVLUS_PORT`** (Docker / LAN).

Auth for hosted Milvus: set **`MILVUS_TOKEN`**, or **`MILVUS_USERNAME`** + **`MILVUS_PASSWORD`** (combined internally as `user:password`).

Optional database name: **`MILVUS_DBNAME`** (default `teleoscope`). Zilliz may or may not expose multi-DB the same way as standalone Milvus; the client falls back to the default DB if needed.

## 1. Export vectors from Docker Milvus

From a machine that can reach your **current** cluster (often the Docker host):

```bash
cd /path/to/Teleoscope
mamba activate teleoscope   # or: conda activate teleoscope
# If Milvus is mapped to localhost (set port if yours differs):
export MIVLUS_PORT=$(docker compose port milvus 19530 | cut -d: -f2)
export MILVUS_HOST=127.0.0.1
# Do NOT set MILVUS_URI here if you want to hit Docker via host/port.
unset MILVUS_URI MILVUS_LITE_PATH

PYTHONPATH=. python scripts/export_milvus_teleoscope.py --out ./milvus-export-docker
```

That writes JSONL (optionally gzipped) under `./milvus-export-docker`, including `collection` / `partition` metadata on each row.

## 2. Create the Zilliz cluster and import

Create an empty cluster (or empty database) in Zilliz. Then:

```bash
cd /path/to/Teleoscope
mamba activate teleoscope
export MILVUS_URI='https://YOUR_ENDPOINT.vectordb.zillizcloud.com:19536'
export MILVUS_TOKEN='paste-token-from-zilliz-console'
export MILVUS_USERNAME='db_admin'      # optional if token alone works for your deployment
export MILVUS_PASSWORD='paste-db-admin-password'
export MILVUS_DBNAME=teleoscope   # optional; match export

PYTHONPATH=. python scripts/import_milvus_teleoscope.py --in ./milvus-export-docker --batch-size 500
```

The importer creates collections/partitions and upserts rows. Tune **`--batch-size`** if you hit payload or timeout limits.

## 3. Point the app and workers at Zilliz

In **`.env`** (and any deployment secrets):

```bash
# Zilliz (example — replace with your endpoint)
MILVUS_TOKEN=your-zilliz-token
MILVUS_USERNAME=db_admin
MILVUS_PASSWORD=your-zilliz-db-admin-password
MILVUS_DBNAME=teleoscope

# Docker Compose + Zilliz: set MILVUS_DOCKER_URI (compose substitutes worker/uploader MILVUS_URI from it).
# If you previously put only MILVUS_URI in .env for Zilliz, use MILVUS_DOCKER_URI for that value instead
# so Compose-injected MILVUS_URI points at Zilliz (plain MILVUS_URI in .env is overridden for those services).
MILVUS_DOCKER_URI=https://YOUR_ENDPOINT.vectordb.zillizcloud.com:19536

# Non-Compose / host scripts: you can still export MILVUS_URI for seed, export, import, status.
# MILVUS_URI=https://YOUR_ENDPOINT.vectordb.zillizcloud.com:19536

# Stop using local Milvus file for remote vector store:
# unset or delete:
# MILVUS_LITE_PATH=
```

### Docker Compose + Zilliz

For **`docker compose`**, worker services (`worker-tasks`, `worker-graph`, `uploader`) set **`MILVUS_URI: ${MILVUS_DOCKER_URI:-http://milvus:19530}`** in `docker-compose.yml`. Put your Zilliz HTTPS endpoint in **`MILVUS_DOCKER_URI`** and **`MILVUS_TOKEN`** in `.env`; workers pick up the substituted **`MILVUS_URI`** (Compose `environment:` overrides `env_file` for that key). If you hardcoded only **`MILVUS_URI`** before, prefer **`MILVUS_DOCKER_URI`** for Compose so workers do not default to in-network `http://milvus:19530` while ignoring your Zilliz URL.

The **app** container still loads `.env` via `env_file`; set the same endpoint there if the Next.js process needs Milvus settings (or use deployment-specific env). After cutover you can **stop** the local stack’s Milvus dependencies to save RAM/CPU:

```bash
docker compose stop milvus etcd minio
```

(Only do this after nothing depends on those containers.)

Restart anything that caches connections:

```bash
docker compose up -d --force-recreate app worker-graph uploader vectorizer worker-tasks
```

## 4. MongoDB is unchanged

Workspace metadata and document records stay in **MongoDB**. Only **vector storage** moved. If you already **rebuilt the corpus** in Mongo against the old Milvus, the same Mongo data remains valid once Zilliz holds the same **`id`** vectors for each workspace partition.

## 5. Verify

- `curl` your app health if configured; open a workspace and run a flow that loads embeddings (search by example, grouping).
- Optional: re-export from Zilliz with `MILVUS_URI` + `MILVUS_TOKEN` and spot-check row counts vs the Docker export.

## Troubleshooting

| Issue | What to check |
|--------|----------------|
| Export logs `database not found` / `DescribeDatabase` UNIMPLEMENTED then **0 rows** | Common on **older Milvus standalone** setups: there may be no separate database named `teleoscope` — vectors live in the **default** DB. Scripts now stop retrying `using_database` after the first failure and use a non-empty `query_iterator` filter. If row_count is still 0, the partition is empty: rebuilding **Mongo** alone does not refill Milvus; re-run `seed-demo-corpus.py` with `MILVUS_URI` or run vectorization. Use **`MILVUS_COLLECTION=teleoscope`** if your collection name differs from `MILVUS_DBNAME`. |
| `UNAUTHENTICATED` / 401 | `MILVUS_TOKEN` matches Zilliz “Connect”; no extra quotes in systemd/Compose if they strip secrets. |
| Database / “not found” | Try unsetting `MILVUS_DBNAME` or use the default DB name Zilliz shows; `embeddings.connect()` falls back when the server does not support named DBs. |
| TLS / connection errors | URI must be **`https://`** for Zilliz public endpoints; port usually **19530**. |
| Slow import | Lower `--batch-size`; run importer closer to Zilliz region (same AWS region as the cluster). |

## Scripts reference

- [`scripts/export_milvus_teleoscope.py`](../scripts/export_milvus_teleoscope.py)
- [`scripts/import_milvus_teleoscope.py`](../scripts/import_milvus_teleoscope.py)
- [`scripts/milvus_io_utils.py`](../scripts/milvus_io_utils.py) (connection helpers used by both)
