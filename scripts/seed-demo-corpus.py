#!/usr/bin/env python3
"""Seed the demo corpus from teleoscope-demo-data (7z + parquet) into Mongo and optionally Milvus.

Uses **pre-vectorized** materials only: documents from the 7z and vectors from parquet.
Does not run the vectorization pipeline (no embedding model, no vectorizer worker).

Run after ./scripts/download-demo-data.sh so that data/documents.jsonl.7z and
data/parquet_export/ (or data/parquet_export/full/) exist.

Creates a dedicated demo-corpus workspace and:
  1. Extracts documents.jsonl.7z, inserts documents into MongoDB (state.vectorized=True).
  2. If Milvus is configured (MILVUS_URI or MILVUS_LITE_PATH), loads vectors from
     parquet into Milvus for the same workspace so ranking/similarity work.

Then set DEMO_CORPUS_WORKSPACE_ID=<printed_workspace_id> so anonymous demo users
see this corpus without uploading or vectorizing.

Usage:
  # Mongo only (no Docker; document list/search work; ranking needs Milvus)
  PYTHONPATH=. python scripts/seed-demo-corpus.py

  # Mongo + Milvus (full demo with vector search; requires Milvus)
  MILVUS_URI=http://localhost:19530 PYTHONPATH=. python scripts/seed-demo-corpus.py

  # Custom data dir
  TELEOSCOPE_DATA_DIR=/path/to/data PYTHONPATH=. python scripts/seed-demo-corpus.py

Requires: pymongo, pyarrow, py7zr. Use the project mamba env: `mamba activate teleoscope` (see environments/environment.yml).
"""
from __future__ import annotations

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


def log(msg: str) -> None:
    print(f"[seed-demo-corpus] {msg}", flush=True)


def ensure_collections(db):
    for name in ["documents", "workspaces", "teams", "workflows"]:
        if name not in db.list_collection_names():
            db.create_collection(name)
            log(f"Created collection: {name}")
    # Text index for search/count
    coll = db.documents
    indexes = [idx["name"] for idx in coll.index_information()]
    if "text" not in indexes:
        coll.create_index([("title", "text"), ("text", "text")], name="text")
        log("Created documents text index.")


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
                    log(f"Skip bad JSON line: {e}")
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
                log(f"Skip bad JSON line: {e}")
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
        result = db.documents.insert_many(chunk)
        inserted.extend(result.inserted_ids)
        log(f"Inserted documents {len(inserted) - len(chunk) + 1}–{len(inserted)}")
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


def seed_milvus(workspace_id: ObjectId, doc_ids: list[ObjectId], parquet_dir: Path) -> None:
    try:
        from backend import embeddings
    except ImportError:
        log("Backend not on path; skip Milvus. Set PYTHONPATH=. when running.")
        return
    if not os.environ.get("MILVUS_URI") and not os.environ.get("MILVUS_LITE_PATH"):
        log("MILVUS_URI and MILVUS_LITE_PATH unset; skipping Milvus (ranking will be unavailable).")
        return
    if not pq:
        log("pyarrow not installed; skipping Milvus load.")
        return
    rows = load_parquet_rows([parquet_dir])
    if len(rows) != len(doc_ids):
        log(
            f"Parquet row count ({len(rows)}) != Mongo doc count ({len(doc_ids)}). "
            "Vectors may be misaligned; skipping Milvus load."
        )
        return
    client = embeddings.connect()
    collection_name = os.environ.get("MILVUS_DBNAME", "teleoscope")
    embeddings.milvus_setup(client, str(workspace_id), collection_name=collection_name)
    embeddings.use_database_if_supported(client)
    # Backend schema: id (varchar), vector (float_vector 1024). Parquet has "id" (from JSONL) and "dense".
    # We map by position: doc_ids[i] -> rows[i]["dense"]
    batch = 1000
    for i in range(0, len(doc_ids), batch):
        chunk_ids = doc_ids[i : i + batch]
        chunk_rows = rows[i : i + batch]
        def to_list(v):
            if hasattr(v, "tolist"):
                return v.tolist()
            return list(v) if not isinstance(v, list) else v

        vector_data = [
            {"id": str(oid), "vector": to_list(chunk_rows[j]["dense"])}
            for j, oid in enumerate(chunk_ids)
        ]
        client.upsert(
            collection_name=collection_name,
            data=vector_data,
            partition_name=str(workspace_id),
        )
        log(f"Upserted vectors {i + 1}–{i + len(chunk_ids)}")
    client.flush(collection_name=collection_name)
    client.close()
    log("Milvus seed done.")


def seed() -> None:
    log("Loading documents from 7z/JSONL...")
    raw_rows = load_documents_jsonl()
    log(f"Loaded {len(raw_rows)} raw rows.")

    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DATABASE]
    ensure_collections(db)

    # Reuse existing demo corpus workspace if present
    existing = db.workspaces.find_one({"label": DEMO_WORKSPACE_LABEL})
    if existing:
        workspace_id = existing["_id"]
        log(f"Reusing existing demo workspace: {workspace_id}")
        # Optionally re-seed documents: delete old docs in this workspace and re-insert
        deleted = db.documents.delete_many({"workspace": workspace_id})
        if deleted.deleted_count:
            log(f"Removed {deleted.deleted_count} old documents from demo workspace.")
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
        log(f"Created team={team_id}, workspace={workspace_id}, workflow={workflow_id}")

    docs = mongo_docs_from_rows(raw_rows, workspace_id)
    if not docs:
        log("No documents to insert.")
        client.close()
        return
    inserted_ids = insert_documents_batched(db, docs)
    log(f"Inserted {len(inserted_ids)} documents into workspace {workspace_id}.")

    parquet_dir = find_parquet_dir()
    if parquet_dir:
        seed_milvus(workspace_id, inserted_ids, parquet_dir)
    else:
        log("No parquet_export/part-*.parquet found; skipping Milvus (ranking will be unavailable).")

    client.close()
    print("")
    print("Demo corpus seeded. Set in your environment:")
    print(f"  export DEMO_CORPUS_WORKSPACE_ID={workspace_id}")
    print("")
    # Parseable line for one-click-demo.sh and other scripts
    print(f"DEMO_CORPUS_WORKSPACE_ID={workspace_id}")


if __name__ == "__main__":
    try:
        seed()
    except FileNotFoundError as e:
        log(str(e))
        sys.exit(1)
    except Exception as e:
        log(f"Error: {e}")
        sys.exit(1)
