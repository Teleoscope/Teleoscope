# Moving from Docker Milvus to Zilliz Cloud

Zilliz Cloud is managed Milvus. Teleoscope talks to it with **`pymilvus`** using the same collection layout (collection `teleoscope` by default, partitions per workspace, `id` + `vector` dim 1024).

## Prerequisites

- A **Zilliz Cloud** cluster (pick a Milvus version compatible with your workload; self-hosted in this repo often uses **2.3.x**).
- From the Zilliz console: **Public endpoint** (URI) and **token** (API key / `user:password` string — copy exactly what the “Connect” panel shows).

Runtime code uses **`backend.embeddings.connect()`**, which honors (in order):

1. **`MILVUS_LITE_PATH`** — local file (skip for Zilliz).
2. **`MILVUS_URI`** — e.g. `https://in01-xxxxxxxx.zillizcloud.com:19530` (use your real host; port is usually **19530**).
3. Otherwise **`MILVUS_HOST`** + **`MIVLUS_PORT`** (Docker / LAN).

Auth for hosted Milvus: set **`MILVUS_TOKEN`**, or **`MILVUS_USERNAME`** + **`MILVUS_PASSWORD`** (combined internally as `user:password`).

Optional database name: **`MILVUS_DBNAME`** (default `teleoscope`). Zilliz may or may not expose multi-DB the same way as standalone Milvus; the client falls back to the default DB if needed.

## 1. Export vectors from Docker Milvus

From a machine that can reach your **current** cluster (often the Docker host):

```bash
cd /path/to/Teleoscope
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
export MILVUS_URI='https://YOUR_ENDPOINT.zillizcloud.com:19530'
export MILVUS_TOKEN='paste-token-from-zilliz-console'
export MILVUS_DBNAME=teleoscope   # optional; match export

PYTHONPATH=. python scripts/import_milvus_teleoscope.py --in ./milvus-export-docker --batch-size 500
```

The importer creates collections/partitions and upserts rows. Tune **`--batch-size`** if you hit payload or timeout limits.

## 3. Point the app and workers at Zilliz

In **`.env`** (and any deployment secrets):

```bash
# Zilliz (example — replace with your endpoint)
MILVUS_URI=https://YOUR_ENDPOINT.zillizcloud.com:19530
MILVUS_TOKEN=your-zilliz-token
MILVUS_DBNAME=teleoscope

# Stop using local Milvus file / Docker URI for workers:
# unset or delete:
# MILVUS_LITE_PATH=
# Do not leave MILVUS_HOST=milvus if you rely on URI — either remove host overrides or
# ensure MILVUS_URI is set everywhere .env is loaded (Compose merges env).
```

**Docker Compose:** services still inject `MILVUS_HOST: milvus` in `docker-compose.yml`. **`MILVUS_URI` in `.env` takes precedence** inside `embeddings.connect()`, so workers and the app use Zilliz as long as `.env` sets `MILVUS_URI` + `MILVUS_TOKEN`. After cutover you can **stop** the local stack’s Milvus dependencies to save RAM/CPU:

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
| `UNAUTHENTICATED` / 401 | `MILVUS_TOKEN` matches Zilliz “Connect”; no extra quotes in systemd/Compose if they strip secrets. |
| Database / “not found” | Try unsetting `MILVUS_DBNAME` or use the default DB name Zilliz shows; `embeddings.connect()` falls back when the server does not support named DBs. |
| TLS / connection errors | URI must be **`https://`** for Zilliz public endpoints; port usually **19530**. |
| Slow import | Lower `--batch-size`; run importer closer to Zilliz region (same AWS region as the cluster). |

## Scripts reference

- [`scripts/export_milvus_teleoscope.py`](../scripts/export_milvus_teleoscope.py)
- [`scripts/import_milvus_teleoscope.py`](../scripts/import_milvus_teleoscope.py)
- [`scripts/milvus_io_utils.py`](../scripts/milvus_io_utils.py) (connection helpers used by both)
