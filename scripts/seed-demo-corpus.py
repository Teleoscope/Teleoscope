#!/usr/bin/env python3
"""Seed the demo corpus from teleoscope-demo-data (7z + parquet) into Mongo and optionally Milvus.

**Scope:** This script is only for **building the anonymous `/demo` stack** (local, CI, staging,
or a dedicated demo host). It is **not** a production maintenance tool: **do not run it against
production MongoDB** after real customer data exists—it drops the `documents` collection by default
and bulk-writes the demo workspace.

Uses **pre-vectorized** materials only: documents from the 7z and vectors from parquet.
Does not run the vectorization pipeline (no embedding model, no vectorizer worker).

Run after ./scripts/download-demo-data.sh so that data/documents.jsonl.7z and
data/parquet_export/ (or data/parquet_export/full/) exist.

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

  # Refresh Milvus vectors only (Mongo unchanged). Requires existing demo workspace + same
  # document count as parquet rows; documents are matched in Mongo _id insertion order.
  MILVUS_URI=http://localhost:19530 PYTHONPATH=. python scripts/seed-demo-corpus.py --milvus-only

  # Multi-workspace DB: only delete/replace documents in the demo workspace (slower on large
  # re-seeds; drops the text index during bulk load unless --keep-text-index). Env:
  # SEED_WORKSPACE_DOCUMENTS_ONLY=1
  PYTHONPATH=. python scripts/seed-demo-corpus.py --workspace-documents-only

Requires: pymongo, pyarrow, py7zr. Use the project mamba env: `mamba activate teleoscope` (see environments/environment.yml).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
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


def ensure_collections(db):
    for name in ["documents", "workspaces", "teams", "workflows"]:
        if name not in db.list_collection_names():
            db.create_collection(name)
            log(f"Created collection: {name}", "OK")
    # Text index is created once after bulk load (see ensure_documents_text_index) so we do
    # not maintain it on every insert during seed — avoids Mongo looking like it is
    # "constantly re-indexing" during large delete_many + insert_many batches.


def wipe_documents_collection(db) -> None:
    """Drop and recreate empty `documents` (all indexes and rows removed in one step)."""
    if "documents" in db.list_collection_names():
        db.drop_collection("documents")
        log(
            "Dropped entire MongoDB `documents` collection (all workspaces). "
            "graph/storage/groups may still hold stale document ObjectIds.",
            "WARN",
        )
    db.create_collection("documents")
    log("Recreated empty documents collection.", "OK")


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
        db.documents.create_index(
            DOCUMENTS_TEXT_INDEX_KEYS,
            name=DOCUMENTS_TEXT_INDEX,
            default_language="english",
        )
        log("Ensured documents text index (for search/count).", "OK")
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
        raise FileNotFoundError(f"Archive not found: {archive_path}. Run ./scripts/download-demo-data.sh first.")
    rows = []
    with py7zr.open(archive_path, "r") as arc:
        for name, bio in arc.readall().items():
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
        return extract_jsonl_from_7z(DOCUMENTS_7Z)
    if jsonl_path.exists():
        return load_jsonl_uncompressed(jsonl_path)
    raise FileNotFoundError(
        f"Neither {DOCUMENTS_7Z} nor {jsonl_path} found. Run ./scripts/download-demo-data.sh first."
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
    inserted = []
    for i in range(0, len(docs), batch_size):
        chunk = docs[i : i + batch_size]
        # unordered: server may parallelize; order of inserted_ids still matches chunk order
        result = db.documents.insert_many(chunk, ordered=False)
        inserted.extend(result.inserted_ids)
        log(f"Inserted documents {len(inserted) - len(chunk) + 1}–{len(inserted)}", "OK")
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


def seed_milvus_only() -> None:
    """Load parquet vectors into Milvus for an existing demo workspace; do not modify Mongo."""
    log_demo_seed_scope_warning()
    parquet_dir = find_parquet_dir()
    if not parquet_dir:
        raise SystemExit(
            f"No parquet_export/part-*.parquet under {DATA_DIR}. "
            "Run ./scripts/download-demo-data.sh first."
        )
    if not pq:
        raise SystemExit("pyarrow is required for Milvus seed. pip install pyarrow")

    parquet_rows = load_parquet_rows([parquet_dir])
    n = len(parquet_rows)
    if n == 0:
        raise SystemExit("Parquet export is empty.")

    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DATABASE]
    workspace_id = resolve_demo_workspace_id(db)
    docs = list(db.documents.find({"workspace": workspace_id}).sort("_id", 1))
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
    log("Milvus-only seed done (Mongo unchanged).", "OK")
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
    rows = load_parquet_rows([parquet_dir])
    if len(rows) != len(doc_ids):
        log(
            f"Parquet row count ({len(rows)}) != Mongo doc count ({len(doc_ids)}). "
            "Vectors may be misaligned; skipping Milvus load.",
            "WARN",
        )
        return
    client = embeddings.connect()
    # Collection name (vectors live here). MILVUS_DBNAME is a legacy alias — it is also used as
    # the *Milvus database* name in embeddings.connect(); on standalone Milvus everything still
    # ends up under the default DB. Prefer MILVUS_COLLECTION when DB name != collection name.
    collection_name = os.environ.get("MILVUS_COLLECTION") or os.environ.get(
        "MILVUS_DBNAME", "teleoscope"
    )
    embeddings.milvus_setup(client, str(workspace_id), collection_name=collection_name)
    embeddings.use_database_if_supported(client)
    # Backend schema: id (varchar), vector (float_vector 1024). Parquet may have "id" (e.g. reddit/source id).
    # Use parquet row "id" when present so Rank can find embeddings keyed by that id; else use Mongo _id.
    batch = 1000
    for i in range(0, len(doc_ids), batch):
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
        client.upsert(
            collection_name=collection_name,
            data=vector_data,
            partition_name=str(workspace_id),
        )
        log(f"Upserted vectors {i + 1}–{i + len(chunk_ids)}", "OK")
    client.flush(collection_name=collection_name)
    client.close()
    log("Milvus seed done.", "OK")


def seed(*, workspace_documents_only: bool = False, keep_text_index: bool = False) -> None:
    if os.environ.get("SEED_WORKSPACE_DOCUMENTS_ONLY", "").lower() in ("1", "true", "yes"):
        workspace_documents_only = True
    if os.environ.get("SEED_KEEP_TEXT_INDEX", "").lower() in ("1", "true", "yes"):
        keep_text_index = True
    # Legacy opt-out for dropping the text index during workspace-scoped re-seed
    if os.environ.get("SEED_DROP_TEXT_INDEX", "").lower() in ("0", "false", "no"):
        keep_text_index = True

    log_demo_seed_scope_warning()
    log("Loading documents from 7z/JSONL...", "INFO")
    raw_rows = load_documents_jsonl()
    log(f"Loaded {len(raw_rows)} raw rows.", "OK")

    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DATABASE]
    ensure_collections(db)

    # Reuse existing demo corpus workspace if present
    existing = db.workspaces.find_one({"label": DEMO_WORKSPACE_LABEL})
    if existing:
        workspace_id = existing["_id"]
        log(f"Reusing existing demo workspace: {workspace_id}", "INFO")
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

    docs = mongo_docs_from_rows(raw_rows, workspace_id)
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
        deleted = db.documents.delete_many({"workspace": workspace_id})
        if deleted.deleted_count:
            log(f"Removed {deleted.deleted_count} old documents from demo workspace.", "INFO")
    else:
        log(
            "Replacing Mongo `documents` by dropping the collection (default for demo re-seed). "
            "Use --workspace-documents-only if other workspaces must keep their documents.",
            "INFO",
        )
        wipe_documents_collection(db)

    inserted_ids = insert_documents_batched(db, docs)
    log(f"Inserted {len(inserted_ids)} documents into workspace {workspace_id}.", "OK")

    ensure_documents_text_index(db)

    count = db.documents.count_documents({"workspace": workspace_id})
    log(f"Verified: {count} documents in demo workspace (Mongo).", "OK")

    parquet_dir = find_parquet_dir()
    if parquet_dir:
        seed_milvus(workspace_id, inserted_ids, parquet_dir)
    else:
        log("No parquet_export/part-*.parquet found; skipping Milvus (ranking will be unavailable).", "INFO")

    client.close()
    # Write ID to file so one-click-demo.sh / refresh-demo-corpus.sh can read it (avoids parsing stdout)
    id_file = REPO_ROOT / ".demo_corpus_workspace_id"
    id_file.write_text(str(workspace_id), encoding="utf-8")
    log(f"Wrote {id_file}", "OK")
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
    args = parser.parse_args()
    try:
        if args.milvus_only:
            seed_milvus_only()
        else:
            seed(
                workspace_documents_only=args.workspace_documents_only,
                keep_text_index=args.keep_text_index,
            )
    except FileNotFoundError as e:
        log(str(e), "FAIL")
        sys.exit(1)
    except Exception as e:
        log(f"Error: {e}", "FAIL")
        sys.exit(1)
