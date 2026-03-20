#!/usr/bin/env python3
"""Seed the demo corpus from teleoscope-demo-data (7z + parquet) into Mongo and optionally Milvus.

**Scope:** This script is only for **building the anonymous `/demo` stack** (local, CI, staging,
or a dedicated demo host). It is **not** a production maintenance tool: **do not run it against
production MongoDB** after real customer data exists—it drops the `documents` collection by default
and bulk-writes the demo workspace.

Uses **pre-vectorized** materials only: documents from the 7z and vectors from parquet.
Does not run the vectorization pipeline (no embedding model, no vectorizer worker).

**Demo files** come from [Teleoscope/teleoscope-demo-data](https://github.com/Teleoscope/teleoscope-demo-data).
If `documents.jsonl.7z` or `documents.jsonl` is missing under `TELEOSCOPE_DATA_DIR`, this script runs
`scripts/download-demo-data.sh` (shallow git clone + copy) automatically. Use **`--download`** to
refresh from GitHub even when files already exist, or **`--no-download`** / **`SEED_NO_DOWNLOAD=1`**
to fail fast when data is absent (air-gapped / pre-staged trees).

Creates or reuses a demo-corpus workspace and:
  1. Extracts documents.jsonl.7z, loads documents into MongoDB (state.vectorized=True).
     By default the entire `documents` collection is dropped and recreated (see
     `--workspace-documents-only` to keep other workspaces' documents).
  2. If Milvus is configured (MILVUS_URI or MILVUS_LITE_PATH), loads vectors from
     parquet into Milvus for the same workspace so ranking/similarity work.

The app auto-discovers this corpus by the workspace label "Demo corpus" in Mongo,
so DEMO_CORPUS_WORKSPACE_ID is optional; set it to avoid a one-time DB lookup.

Usage:
  # Mongo only (no Docker; document list/search work; ranking needs Milvus)
  PYTHONPATH=. python scripts/seed-demo-corpus.py

  # Mongo + Milvus (full demo with vector search; requires Milvus)
  MILVUS_URI=http://localhost:19530 PYTHONPATH=. python scripts/seed-demo-corpus.py

  # Custom data dir
  TELEOSCOPE_DATA_DIR=/path/to/data PYTHONPATH=. python scripts/seed-demo-corpus.py

  # Refresh Milvus vectors only (Mongo unchanged). Fetches teleoscope-demo-data if parquet
  # is missing (same rules as full seed). Requires existing demo workspace + same document
  # count as parquet rows; documents are matched in Mongo _id insertion order.
  MILVUS_URI=http://localhost:19530 PYTHONPATH=. python scripts/seed-demo-corpus.py --milvus-only

  # Multi-workspace DB: only delete/replace documents in the demo workspace (slower on large
  # re-seeds; drops the text index during bulk load unless --keep-text-index). Env:
  # SEED_WORKSPACE_DOCUMENTS_ONLY=1
  PYTHONPATH=. python scripts/seed-demo-corpus.py --workspace-documents-only

  # Re-clone teleoscope-demo-data into data/ before seed (same as download-demo-data.sh)
  PYTHONPATH=. python scripts/seed-demo-corpus.py --download

Requires: pymongo, pyarrow, py7zr, git, bash (for automatic demo data fetch). Use the project mamba env: `mamba activate teleoscope` (see environments/environment.yml).
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Optional deps for 7z and parquet
try:
    import py7zr
except ImportError:
    py7zr = None
try:
    import pyarrow.parquet as pq
except ImportError:
    pq = None

from bson.objectid import ObjectId
from pymongo import MongoClient

# Repo root and data dir
REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("TELEOSCOPE_DATA_DIR", REPO_ROOT / "data"))

DOCUMENTS_7Z = DATA_DIR / "documents.jsonl.7z"
PARQUET_DIRS = [
    DATA_DIR / "parquet_export" / "full",
    DATA_DIR / "parquet_export",
]
MONGODB_URI = os.environ.get(
    "MONGODB_URI",
    "mongodb://teleoscope:teleoscope_dev_password@localhost:27017/teleoscope"
    "?directConnection=true&serverSelectionTimeoutMS=5000&authSource=admin",
)
MONGODB_DATABASE = os.environ.get("MONGODB_DATABASE", "teleoscope")

DEMO_TEAM_LABEL = "Demo corpus (shared)"
DEMO_WORKSPACE_LABEL = "Demo corpus"
DEMO_WORKFLOW_LABEL = "Default"
BATCH_INSERT = 500
DOCUMENTS_TEXT_INDEX = "text"
DOCUMENTS_TEXT_INDEX_KEYS = [("title", "text"), ("text", "text")]


def log(msg: str, level: str = "INFO") -> None:
    prefix = {"OK": "[OK]", "INFO": "[INFO]", "WARN": "[WARN]", "FAIL": "[FAIL]"}.get(level, "[INFO]")
    print(f"{prefix} {msg}", flush=True)


def log_demo_seed_scope_warning() -> None:
    log(
        "Demo corpus seed — for local/staging/demo DBs only. Do not use on production.",
        "WARN",
    )


def _fmt_elapsed(seconds: float) -> str:
    if seconds >= 120:
        return f"{seconds / 60:.1f}m"
    return f"{seconds:.1f}s"


def demo_document_sources_present() -> bool:
    jsonl_path = DATA_DIR / "documents.jsonl"
    return DOCUMENTS_7Z.exists() or jsonl_path.is_file()


def run_download_demo_data_script() -> None:
    """Clone Teleoscope/teleoscope-demo-data via scripts/download-demo-data.sh (same as one-click)."""
    bash = shutil.which("bash")
    if not bash:
        raise RuntimeError(
            "bash not found on PATH; cannot run scripts/download-demo-data.sh. "
            "Fetch https://github.com/Teleoscope/teleoscope-demo-data manually into TELEOSCOPE_DATA_DIR."
        )
    script = REPO_ROOT / "scripts" / "download-demo-data.sh"
    if not script.is_file():
        raise FileNotFoundError(
            f"Missing {script}; clone https://github.com/Teleoscope/teleoscope-demo-data into {DATA_DIR} manually."
        )
    log(
        f"Running {script.name} → {DATA_DIR} (repo overridable with TELEOSCOPE_DEMO_DATA_REPO / "
        "TELEOSCOPE_DEMO_DATA_BRANCH, same as the shell script).",
        "INFO",
    )
    t0 = time.perf_counter()
    subprocess.run([bash, str(script), str(DATA_DIR)], cwd=str(REPO_ROOT), check=True)
    log(f"download-demo-data.sh finished in {_fmt_elapsed(time.perf_counter() - t0)}.", "OK")


def apply_download_env_overrides(download: bool, no_download: bool) -> tuple[bool, bool]:
    env_no_dl = os.environ.get("SEED_NO_DOWNLOAD", "").lower() in ("1", "true", "yes")
    env_force_dl = os.environ.get("SEED_DOWNLOAD_DEMO_DATA", "").lower() in ("1", "true", "yes")
    if env_no_dl:
        no_download = True
    if env_force_dl:
        download = True
    if no_download and download:
        log("Both download and no-download requested; honoring no-download.", "WARN")
        download = False
    return download, no_download


def ensure_demo_corpus_materials(*, force_download: bool, no_download: bool) -> None:
    """Ensure documents.jsonl.7z or documents.jsonl exists; optionally clone from GitHub."""
    if no_download:
        if not demo_document_sources_present():
            raise FileNotFoundError(
                f"No demo documents under {DATA_DIR}: need documents.jsonl.7z or documents.jsonl. "
                "Run ./scripts/download-demo-data.sh, or omit --no-download / SEED_NO_DOWNLOAD."
            )
        log("Skipping demo data fetch (--no-download / SEED_NO_DOWNLOAD).", "INFO")
        return

    if force_download:
        log("Refreshing demo corpus files from GitHub (download-demo-data.sh)…", "INFO")
        run_download_demo_data_script()
    elif not demo_document_sources_present():
        log(
            f"No documents.jsonl.7z or documents.jsonl under {DATA_DIR}; "
            "fetching Teleoscope/teleoscope-demo-data…",
            "INFO",
        )
        run_download_demo_data_script()

    if not demo_document_sources_present():
        raise FileNotFoundError(
            f"Demo document sources still missing under {DATA_DIR} after download-demo-data.sh."
        )


def ensure_milvus_seed_materials(*, force_download: bool, no_download: bool) -> None:
    """Ensure parquet_export/part-*.parquet exists (clone demo-data repo if needed)."""
    if no_download:
        if find_parquet_dir() is None:
            raise SystemExit(
                f"No parquet_export/part-*.parquet under {DATA_DIR}. "
                "Run ./scripts/download-demo-data.sh, or omit --no-download / SEED_NO_DOWNLOAD."
            )
        log("Skipping demo data fetch (--no-download / SEED_NO_DOWNLOAD).", "INFO")
        return

    if force_download or find_parquet_dir() is None:
        log("Fetching Teleoscope/teleoscope-demo-data (parquet required for --milvus-only)…", "INFO")
        run_download_demo_data_script()

    if find_parquet_dir() is None:
        raise SystemExit(
            f"No parquet_export/part-*.parquet under {DATA_DIR} after download-demo-data.sh."
        )


def ensure_collections(db):
    needed = ["documents", "workspaces", "teams", "workflows"]
    existing = set(db.list_collection_names())
    created = [n for n in needed if n not in existing]
    for name in created:
        db.create_collection(name)
        log(f"Created collection: {name}", "OK")
    if not created:
        log(f"Core collections already present: {', '.join(needed)}", "INFO")
    # Text index is created once after bulk load (see ensure_documents_text_index) so we do
    # not maintain it on every insert during seed — avoids Mongo looking like it is
    # "constantly re-indexing" during large delete_many + insert_many batches.


def wipe_documents_collection(db) -> None:
    """Drop and recreate empty `documents` (all indexes and rows removed in one step)."""
    if "documents" in db.list_collection_names():
        try:
            est = db.documents.estimated_document_count()
            log(f"`documents` pre-drop estimated row count: {est:,}", "INFO")
        except Exception as e:
            log(f"Could not estimate document count before drop: {e}", "INFO")
        t0 = time.perf_counter()
        db.drop_collection("documents")
        log(
            f"Dropped entire MongoDB `documents` collection in {_fmt_elapsed(time.perf_counter() - t0)} "
            "(all workspaces). graph/storage/groups may still hold stale document ObjectIds.",
            "WARN",
        )
    t0 = time.perf_counter()
    db.create_collection("documents")
    log(f"Recreated empty `documents` collection in {_fmt_elapsed(time.perf_counter() - t0)}.", "OK")


def drop_documents_text_index_if_exists(db) -> None:
    """Drop the shared documents text index before bulk re-seed (optional, faster bulk load)."""
    try:
        db.documents.drop_index(DOCUMENTS_TEXT_INDEX)
        log(
            f"Dropped index {DOCUMENTS_TEXT_INDEX!r} on documents — $text search is offline "
            "until the seed finishes.",
            "WARN",
        )
    except Exception as e:
        if "index not found" in str(e).lower() or "can't find index" in str(e).lower():
            log(f"No existing {DOCUMENTS_TEXT_INDEX!r} index to drop.", "INFO")
        else:
            log(f"Could not drop text index: {e}", "WARN")


def ensure_documents_text_index(db) -> None:
    """Single text index definition (same options everywhere) after bulk insert."""
    try:
        n = db.documents.estimated_document_count()
        log(
            f"Building text index {DOCUMENTS_TEXT_INDEX!r} on ~{n:,} documents "
            "(title + text, english); this can take several minutes on large corpora…",
            "INFO",
        )
        t0 = time.perf_counter()
        db.documents.create_index(
            DOCUMENTS_TEXT_INDEX_KEYS,
            name=DOCUMENTS_TEXT_INDEX,
            default_language="english",
        )
        log(
            f"Text index {DOCUMENTS_TEXT_INDEX!r} ready in {_fmt_elapsed(time.perf_counter() - t0)}.",
            "OK",
        )
    except Exception as e:
        msg = str(e).lower()
        if "already exists" in msg or "duplicate" in msg or "same name" in msg:
            log("Documents text index already present with compatible definition.", "INFO")
        else:
            log(f"Could not ensure text index: {e}", "WARN")


def extract_jsonl_from_7z(archive_path: Path) -> list[dict]:
    if not py7zr:
        raise RuntimeError("py7zr is required to read documents.jsonl.7z. pip install py7zr")
    if not archive_path.exists():
        raise FileNotFoundError(
            f"Archive not found: {archive_path}. Re-run with network access or run ./scripts/download-demo-data.sh."
        )
    rows = []
    log(f"Opening 7z archive: {archive_path}", "INFO")
    with py7zr.open(archive_path, "r") as arc:
        all_files = arc.readall()
        jsonl_names = [n for n in all_files if n.endswith(".jsonl")]
        log(f"JSONL entries in archive ({len(jsonl_names)}): {jsonl_names}", "INFO")
        t0 = time.perf_counter()
        for name, bio in all_files.items():
            if not name.endswith(".jsonl"):
                continue
            for line in bio:
                line = line.decode("utf-8").strip()
                if not line:
                    continue
                try:
                    rows.append(json.loads(line))
                except json.JSONDecodeError as e:
                    log(f"Skip bad JSON line: {e}", "WARN")
        log(
            f"Parsed {len(rows):,} lines from 7z JSONL in {_fmt_elapsed(time.perf_counter() - t0)}.",
            "OK",
        )
    return rows


def load_jsonl_uncompressed(path: Path) -> list[dict]:
    """If someone extracted the 7z manually."""
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as e:
                log(f"Skip bad JSON line: {e}", "WARN")
    return rows


def load_documents_jsonl() -> list[dict]:
    jsonl_path = DATA_DIR / "documents.jsonl"
    if DOCUMENTS_7Z.exists():
        log(f"Document source: compressed archive {DOCUMENTS_7Z}", "INFO")
        return extract_jsonl_from_7z(DOCUMENTS_7Z)
    if jsonl_path.exists():
        log(f"Reading uncompressed JSONL: {jsonl_path}", "INFO")
        t0 = time.perf_counter()
        rows = load_jsonl_uncompressed(jsonl_path)
        log(
            f"Loaded {len(rows):,} rows from JSONL in {_fmt_elapsed(time.perf_counter() - t0)}.",
            "OK",
        )
        return rows
    raise FileNotFoundError(
        f"Neither {DOCUMENTS_7Z} nor {jsonl_path} found after fetch step. "
        "Check TELEOSCOPE_DATA_DIR or run ./scripts/download-demo-data.sh."
    )


def mongo_docs_from_rows(rows: list[dict], workspace_id: ObjectId) -> list[dict]:
    docs = []
    for row in rows:
        title = (row.get("title") or "").strip() or "Untitled"
        text = (row.get("text") or "").strip()
        if not text and not title:
            continue
        meta = {}
        for k, v in row.items():
            if k in ("title", "text", "id"):
                continue
            if v is None:
                continue
            if isinstance(v, (str, int, float, bool)):
                meta[k] = v
            elif isinstance(v, (list, dict)):
                try:
                    json.dumps(v)
                    meta[k] = v
                except (TypeError, ValueError):
                    pass
        source_id = row.get("id")
        if source_id is not None:
            meta["source_id"] = str(source_id)
        docs.append({
            "text": text[:1_000_000],
            "title": title[:2048],
            "relationships": {},
            "metadata": meta,
            "workspace": workspace_id,
            "state": {"vectorized": True},
        })
    return docs


def insert_documents_batched(db, docs: list[dict], batch_size: int = BATCH_INSERT) -> list[ObjectId]:
    total = len(docs)
    n_batches = (total + batch_size - 1) // batch_size
    inserted: list[ObjectId] = []
    t_all = time.perf_counter()
    log(
        f"Mongo insert_many: {total:,} documents in {n_batches} batch(es) of up to {batch_size} (ordered=False).",
        "INFO",
    )
    for bi, i in enumerate(range(0, total, batch_size)):
        chunk = docs[i : i + batch_size]
        t0 = time.perf_counter()
        # unordered: server may parallelize; order of inserted_ids still matches chunk order
        result = db.documents.insert_many(chunk, ordered=False)
        inserted.extend(result.inserted_ids)
        dt = time.perf_counter() - t0
        rate = len(chunk) / dt if dt > 0 else 0.0
        lo, hi = len(inserted) - len(chunk) + 1, len(inserted)
        log(
            f"Mongo batch {bi + 1}/{n_batches}: documents {lo:,}–{hi:,} "
            f"({len(chunk):,} inserted, {dt:.2f}s, {rate:,.0f} docs/s)",
            "OK",
        )
    log(
        f"Mongo insert_many complete: {len(inserted):,} documents in {_fmt_elapsed(time.perf_counter() - t_all)}.",
        "OK",
    )
    return inserted


def load_parquet_rows(parquet_dirs: list[Path]) -> list[dict]:
    if not pq:
        raise RuntimeError("pyarrow is required to read parquet. pip install pyarrow")
    all_rows = []
    for d in parquet_dirs:
        if not d.is_dir():
            continue
        files = sorted(d.glob("part-*.parquet"))
        for f in files:
            tbl = pq.read_table(f)
            for i in range(tbl.num_rows):
                row = {}
                for name in tbl.column_names:
                    col = tbl.column(name)
                    val = col[i]
                    if hasattr(val, "as_py"):
                        val = val.as_py()
                    row[name] = val
                all_rows.append(row)
    return all_rows


def find_parquet_dir() -> Path | None:
    for d in PARQUET_DIRS:
        if d.is_dir() and list(d.glob("part-*.parquet")):
            return d
    return None


def resolve_demo_workspace_id(db) -> ObjectId:
    raw = os.environ.get("DEMO_CORPUS_WORKSPACE_ID", "").strip()
    if raw:
        try:
            return ObjectId(raw)
        except Exception as e:
            raise SystemExit(f"Invalid DEMO_CORPUS_WORKSPACE_ID: {raw!r}") from e
    ws = db.workspaces.find_one({"label": DEMO_WORKSPACE_LABEL})
    if not ws:
        raise SystemExit(
            'No demo workspace found (label "Demo corpus"). '
            "Run full seed-demo-corpus.py once, or set DEMO_CORPUS_WORKSPACE_ID."
        )
    return ws["_id"]


def seed_milvus_only(*, download: bool = False, no_download: bool = False) -> None:
    """Load parquet vectors into Milvus for an existing demo workspace; do not modify Mongo."""
    download, no_download = apply_download_env_overrides(download, no_download)
    log_demo_seed_scope_warning()
    t_run = time.perf_counter()
    log(f"Milvus-only mode: TELEOSCOPE_DATA_DIR={DATA_DIR}", "INFO")
    ensure_milvus_seed_materials(force_download=download, no_download=no_download)
    parquet_dir = find_parquet_dir()
    if not parquet_dir:
        raise SystemExit(f"No parquet_export/part-*.parquet under {DATA_DIR}.")
    if not pq:
        raise SystemExit("pyarrow is required for Milvus seed. pip install pyarrow")

    log(f"Loading parquet (validation pass) from {parquet_dir}…", "INFO")
    t_pq = time.perf_counter()
    parquet_rows = load_parquet_rows([parquet_dir])
    n = len(parquet_rows)
    log(f"Parquet validation load: {n:,} rows in {_fmt_elapsed(time.perf_counter() - t_pq)}.", "OK")
    if n == 0:
        raise SystemExit("Parquet export is empty.")

    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DATABASE]
    log(f"Connected to MongoDB database={MONGODB_DATABASE!r} (Milvus-only; Mongo not modified).", "INFO")
    workspace_id = resolve_demo_workspace_id(db)
    log(f"Loading Mongo documents for workspace {workspace_id} (sort by _id)…", "INFO")
    t_m = time.perf_counter()
    docs = list(db.documents.find({"workspace": workspace_id}).sort("_id", 1))
    log(f"Mongo find returned {len(docs):,} documents in {_fmt_elapsed(time.perf_counter() - t_m)}.", "OK")
    if len(docs) != n:
        raise SystemExit(
            f"Milvus-only seed needs Mongo document count ({len(docs)}) to equal parquet "
            f"rows ({n}). Documents must align in the same order as a full seed (Mongo sort "
            "by _id). If you changed the demo workspace in Mongo, run full "
            "seed-demo-corpus.py without --milvus-only."
        )

    doc_ids = [d["_id"] for d in docs]
    log(
        f"Milvus-only: workspace {workspace_id}, {n} Mongo docs × parquet rows (by _id order).",
        "INFO",
    )
    seed_milvus(workspace_id, doc_ids, parquet_dir)
    client.close()

    id_file = REPO_ROOT / ".demo_corpus_workspace_id"
    id_file.write_text(str(workspace_id), encoding="utf-8")
    log(f"Wrote {id_file}", "OK")
    log(
        f"Milvus-only seed done (Mongo unchanged). Total time: {_fmt_elapsed(time.perf_counter() - t_run)}.",
        "OK",
    )
    print("", flush=True)
    print(f"DEMO_CORPUS_WORKSPACE_ID={workspace_id}", flush=True)


def seed_milvus(workspace_id: ObjectId, doc_ids: list[ObjectId], parquet_dir: Path) -> None:
    try:
        from backend import embeddings
    except ImportError:
        log("Backend not on path; skip Milvus. Set PYTHONPATH=. when running.", "WARN")
        return
    if not os.environ.get("MILVUS_URI") and not os.environ.get("MILVUS_LITE_PATH"):
        log("MILVUS_URI and MILVUS_LITE_PATH unset; skipping Milvus (ranking will be unavailable).", "INFO")
        return
    if not pq:
        log("pyarrow not installed; skipping Milvus load.", "WARN")
        return
    part_files = sorted(parquet_dir.glob("part-*.parquet"))
    log(
        f"Milvus load: parquet dir {parquet_dir} ({len(part_files)} part-*.parquet file(s)), "
        f"{len(doc_ids):,} Mongo document ids to align.",
        "INFO",
    )
    t_load = time.perf_counter()
    rows = load_parquet_rows([parquet_dir])
    log(
        f"Read {len(rows):,} parquet rows in {_fmt_elapsed(time.perf_counter() - t_load)}.",
        "OK",
    )
    if len(rows) != len(doc_ids):
        log(
            f"Parquet row count ({len(rows)}) != Mongo doc count ({len(doc_ids)}). "
            "Vectors may be misaligned; skipping Milvus load.",
            "WARN",
        )
        return
    t_conn = time.perf_counter()
    client = embeddings.connect()
    log(f"Milvus client connected in {_fmt_elapsed(time.perf_counter() - t_conn)}.", "INFO")
    # Collection name (vectors live here). MILVUS_DBNAME is a legacy alias — it is also used as
    # the *Milvus database* name in embeddings.connect(); on standalone Milvus everything still
    # ends up under the default DB. Prefer MILVUS_COLLECTION when DB name != collection name.
    collection_name = os.environ.get("MILVUS_COLLECTION") or os.environ.get(
        "MILVUS_DBNAME", "teleoscope"
    )
    log(
        f"Milvus collection={collection_name!r}, partition (workspace)={workspace_id!s}, "
        f"upsert batch size=1000.",
        "INFO",
    )
    t_setup = time.perf_counter()
    embeddings.milvus_setup(client, str(workspace_id), collection_name=collection_name)
    embeddings.use_database_if_supported(client)
    log(f"milvus_setup + use_database_if_supported in {_fmt_elapsed(time.perf_counter() - t_setup)}.", "OK")
    # Backend schema: id (varchar), vector (float_vector 1024). Parquet may have "id" (e.g. reddit/source id).
    # Use parquet row "id" when present so Rank can find embeddings keyed by that id; else use Mongo _id.
    batch = 1000
    n_batches = (len(doc_ids) + batch - 1) // batch
    t_upsert = time.perf_counter()
    for b_idx, i in enumerate(range(0, len(doc_ids), batch)):
        chunk_ids = doc_ids[i : i + batch]
        chunk_rows = rows[i : i + batch]
        def to_list(v):
            if hasattr(v, "tolist"):
                return v.tolist()
            return list(v) if not isinstance(v, list) else v

        def vector_id(j, oid):
            row_id = chunk_rows[j].get("id") if chunk_rows[j] else None
            if row_id is not None:
                return str(row_id)
            return str(oid)

        vector_data = [
            {"id": vector_id(j, oid), "vector": to_list(chunk_rows[j]["dense"])}
            for j, oid in enumerate(chunk_ids)
        ]
        t0 = time.perf_counter()
        client.upsert(
            collection_name=collection_name,
            data=vector_data,
            partition_name=str(workspace_id),
        )
        dt = time.perf_counter() - t0
        log(
            f"Milvus upsert batch {b_idx + 1}/{n_batches}: vectors {i + 1:,}–{i + len(chunk_ids):,} "
            f"({len(chunk_ids):,} rows, {dt:.2f}s)",
            "OK",
        )
    log(f"All Milvus upserts done in {_fmt_elapsed(time.perf_counter() - t_upsert)}.", "OK")
    t_flush = time.perf_counter()
    client.flush(collection_name=collection_name)
    client.close()
    log(f"Milvus flush + client close in {_fmt_elapsed(time.perf_counter() - t_flush)}.", "OK")
    log("Milvus seed done.", "OK")


def seed(
    *,
    workspace_documents_only: bool = False,
    keep_text_index: bool = False,
    download: bool = False,
    no_download: bool = False,
) -> None:
    if os.environ.get("SEED_WORKSPACE_DOCUMENTS_ONLY", "").lower() in ("1", "true", "yes"):
        workspace_documents_only = True
    if os.environ.get("SEED_KEEP_TEXT_INDEX", "").lower() in ("1", "true", "yes"):
        keep_text_index = True
    # Legacy opt-out for dropping the text index during workspace-scoped re-seed
    if os.environ.get("SEED_DROP_TEXT_INDEX", "").lower() in ("0", "false", "no"):
        keep_text_index = True

    download, no_download = apply_download_env_overrides(download, no_download)

    log_demo_seed_scope_warning()
    t_seed = time.perf_counter()
    log(f"TELEOSCOPE_DATA_DIR={DATA_DIR}", "INFO")
    ensure_demo_corpus_materials(force_download=download, no_download=no_download)
    log("Loading documents from 7z/JSONL...", "INFO")
    raw_rows = load_documents_jsonl()
    log(f"Loaded {len(raw_rows):,} raw rows from source.", "OK")

    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DATABASE]
    if workspace_documents_only:
        _mode = (
            "Re-seed: workspace-documents-only; text index kept during bulk."
            if keep_text_index
            else "Re-seed: workspace-documents-only; text index dropped during bulk."
        )
    else:
        _mode = "Re-seed: entire `documents` collection replaced (default)."
    log(f"Connected to MongoDB database={MONGODB_DATABASE!r}. {_mode}", "INFO")
    ensure_collections(db)

    # Reuse existing demo corpus workspace if present
    existing = db.workspaces.find_one({"label": DEMO_WORKSPACE_LABEL})
    if existing:
        workspace_id = existing["_id"]
        log(f"Reusing existing demo workspace _id={workspace_id}", "INFO")
    else:
        team_id = ObjectId()
        workspace_id = ObjectId()
        workflow_id = ObjectId()
        db.teams.insert_one({
            "_id": team_id,
            "owner": "demo-corpus-seed",
            "label": DEMO_TEAM_LABEL,
            "workspaces": [workspace_id],
            "users": [],
        })
        db.workspaces.insert_one({
            "_id": workspace_id,
            "label": DEMO_WORKSPACE_LABEL,
            "team": team_id,
            "workflows": [workflow_id],
            "settings": {"document_height": 35, "document_width": 100, "expanded": False},
            "storage": [],
            "selected_workflow": workflow_id,
        })
        db.workflows.insert_one({
            "_id": workflow_id,
            "workspace": workspace_id,
            "label": DEMO_WORKFLOW_LABEL,
            "nodes": [],
            "edges": [],
            "bookmarks": [],
            "selection": {"nodes": [], "edges": []},
            "settings": {"color": "#94a3b8", "title_length": 50},
            "last_update": "2024-01-01T00:00:00.000Z",
            "logical_clock": 100,
        })
        log(f"Created team={team_id}, workspace={workspace_id}, workflow={workflow_id}", "OK")

    t_build = time.perf_counter()
    docs = mongo_docs_from_rows(raw_rows, workspace_id)
    log(
        f"Built {len(docs):,} Mongo document payloads from {len(raw_rows):,} raw rows "
        f"in {_fmt_elapsed(time.perf_counter() - t_build)}.",
        "INFO",
    )
    if not docs:
        log("No documents to insert.", "WARN")
        client.close()
        return

    if workspace_documents_only:
        if not keep_text_index:
            log(
                "Dropping shared documents text index before bulk delete/insert "
                "($text offline for all workspaces until rebuild).",
                "WARN",
            )
            drop_documents_text_index_if_exists(db)
        pre_del = db.documents.count_documents({"workspace": workspace_id})
        log(f"Workspace-scoped delete: removing up to {pre_del:,} documents for workspace {workspace_id}…", "INFO")
        t_del = time.perf_counter()
        deleted = db.documents.delete_many({"workspace": workspace_id})
        log(
            f"delete_many acknowledged: removed {deleted.deleted_count:,} document(s) "
            f"in {_fmt_elapsed(time.perf_counter() - t_del)}.",
            "INFO",
        )
    else:
        log(
            "Replacing Mongo `documents` by dropping the collection (default for demo re-seed). "
            "Use --workspace-documents-only if other workspaces must keep their documents.",
            "INFO",
        )
        wipe_documents_collection(db)

    inserted_ids = insert_documents_batched(db, docs)
    log(f"Inserted {len(inserted_ids):,} documents into workspace {workspace_id}.", "OK")

    ensure_documents_text_index(db)

    count = db.documents.count_documents({"workspace": workspace_id})
    log(f"Verified count_documents(workspace=demo): {count:,} (expected {len(inserted_ids):,}).", "OK")

    parquet_dir = find_parquet_dir()
    if parquet_dir:
        log(f"Parquet vectors: using {parquet_dir}", "INFO")
        seed_milvus(workspace_id, inserted_ids, parquet_dir)
    else:
        log(
            "No parquet_export/part-*.parquet found under data paths; skipping Milvus (ranking unavailable).",
            "INFO",
        )

    client.close()
    # Write ID to file so one-click-demo.sh / refresh-demo-corpus.sh can read it (avoids parsing stdout)
    id_file = REPO_ROOT / ".demo_corpus_workspace_id"
    id_file.write_text(str(workspace_id), encoding="utf-8")
    log(f"Wrote {id_file}", "OK")
    log(f"Total seed time: {_fmt_elapsed(time.perf_counter() - t_seed)}.", "OK")
    print("", flush=True)
    print("[OK] Demo corpus seeded. Set in your environment:", flush=True)
    print(f"  export DEMO_CORPUS_WORKSPACE_ID={workspace_id}", flush=True)
    print("", flush=True)
    # Parseable line for scripts (match with grep 'DEMO_CORPUS_WORKSPACE_ID=')
    print(f"DEMO_CORPUS_WORKSPACE_ID={workspace_id}", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--milvus-only",
        action="store_true",
        help=(
            "Only upsert vectors from parquet into Milvus for the demo workspace. "
            "Does not read the 7z or change Mongo. Requires MILVUS_URI or MILVUS_LITE_PATH, "
            "and Mongo document count must match parquet row count (sorted by _id)."
        ),
    )
    parser.add_argument(
        "--workspace-documents-only",
        action="store_true",
        help=(
            "Only delete documents in the demo workspace instead of dropping the entire "
            "`documents` collection. Slower for large corpora; by default the text index is "
            "dropped during bulk load (use --keep-text-index to skip). "
            "Same as env SEED_WORKSPACE_DOCUMENTS_ONLY=1."
        ),
    )
    parser.add_argument(
        "--keep-text-index",
        action="store_true",
        help=(
            "With --workspace-documents-only: do not drop the shared text index before bulk "
            "writes (slower). Ignored when the full collection is dropped (default seed path). "
            "Same as env SEED_KEEP_TEXT_INDEX=1."
        ),
    )
    dl = parser.add_mutually_exclusive_group()
    dl.add_argument(
        "--download",
        action="store_true",
        help=(
            "Always run scripts/download-demo-data.sh first (shallow clone "
            "Teleoscope/teleoscope-demo-data into TELEOSCOPE_DATA_DIR). Same as SEED_DOWNLOAD_DEMO_DATA=1."
        ),
    )
    dl.add_argument(
        "--no-download",
        action="store_true",
        help=(
            "Never fetch demo data; fail if documents.jsonl.7z and documents.jsonl are missing. "
            "Same as SEED_NO_DOWNLOAD=1."
        ),
    )
    args = parser.parse_args()
    try:
        if args.milvus_only:
            seed_milvus_only(download=args.download, no_download=args.no_download)
        else:
            seed(
                workspace_documents_only=args.workspace_documents_only,
                keep_text_index=args.keep_text_index,
                download=args.download,
                no_download=args.no_download,
            )
    except FileNotFoundError as e:
        log(str(e), "FAIL")
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        log(
            "download-demo-data.sh failed. Check git, network, and "
            "TELEOSCOPE_DEMO_DATA_REPO / TELEOSCOPE_DEMO_DATA_BRANCH. "
            f"({e})",
            "FAIL",
        )
        sys.exit(1)
    except Exception as e:
        log(f"Error: {e}", "FAIL")
        sys.exit(1)
