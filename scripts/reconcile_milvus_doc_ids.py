#!/usr/bin/env python3
"""Reconcile Teleoscope Milvus ids with current Mongo document ids.

This maintenance script is intended for cases where Mongo documents have been
re-seeded or re-created, so their current ``_id`` no longer matches the Milvus
primary key used for previously loaded vectors. It reads Mongo documents for a
workspace, uses ``metadata.source_id`` to find the existing Milvus vectors, and
upserts alias rows keyed by the current Mongo ``_id`` into the same Milvus
partition.

The original Milvus rows keyed by ``metadata.source_id`` are left in place.
This makes current document ids resolvable without requiring a destructive
re-vectorization or a full Milvus rebuild.

Usage (repo root; use the normal project env):
  PYTHONPATH=. python scripts/reconcile_milvus_doc_ids.py --workspace-id <workspace_id>

  # Demo convenience: auto-resolve the workspace with label "Demo corpus"
  PYTHONPATH=. python scripts/reconcile_milvus_doc_ids.py --demo-workspace

  # Preview only
  PYTHONPATH=. python scripts/reconcile_milvus_doc_ids.py --workspace-id <workspace_id> --dry-run
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv()

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from bson.objectid import ObjectId

from backend import embeddings
from backend import utils
from milvus_io_utils import connect_milvus_client, use_milvus_db


logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("reconcile_milvus_doc_ids")


def _collection_name() -> str:
    return (os.getenv("MILVUS_COLLECTION") or os.getenv("MILVUS_DBNAME", "teleoscope")).strip()


def _database_name() -> str:
    return (os.getenv("MONGODB_DATABASE") or "teleoscope").strip()


def _resolve_demo_workspace_id(db) -> ObjectId:
    ws = db.workspaces.find_one({"label": "Demo corpus"}, {"_id": 1})
    if not ws:
        raise SystemExit("Could not find workspace with label 'Demo corpus'.")
    return ws["_id"]


def _chunked(seq: list[Any], size: int):
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


def _workspace_documents(db, workspace_id: ObjectId) -> list[dict[str, str]]:
    docs = list(
        db.documents.find(
            {"workspace": workspace_id, "metadata.source_id": {"$exists": True, "$ne": None}},
            {"_id": 1, "metadata.source_id": 1},
        )
    )
    rows: list[dict[str, str]] = []
    for doc in docs:
        source_id = str((doc.get("metadata") or {}).get("source_id", "")).strip()
        mongo_id = str(doc["_id"])
        if not source_id:
            continue
        if source_id == mongo_id:
            continue
        rows.append({"mongo_id": mongo_id, "source_id": source_id})
    return rows


def _existing_alias_ids(
    client,
    collection_name: str,
    workspace_id: str,
    mongo_ids: list[str],
    *,
    lookup_batch_size: int,
    progress_every: int,
) -> set[str]:
    if not mongo_ids:
        return set()
    found: set[str] = set()
    total = len(mongo_ids)
    batches = (total + lookup_batch_size - 1) // lookup_batch_size
    for batch_idx, chunk in enumerate(_chunked(mongo_ids, lookup_batch_size), start=1):
        rows = client.get(
            collection_name=collection_name,
            partition_names=[workspace_id],
            ids=chunk,
            output_fields=[],
        )
        for row in rows:
            rid = str(row.get("id", "")).strip()
            if rid:
                found.add(rid)
        if batch_idx == 1 or batch_idx % progress_every == 0 or batch_idx == batches:
            log.info(
                "Alias scan: batch %s/%s (%s/%s ids), found %s existing aliases so far.",
                batch_idx,
                batches,
                min(batch_idx * lookup_batch_size, total),
                total,
                len(found),
            )
    return found


def _source_vectors(
    client,
    collection_name: str,
    workspace_id: str,
    source_ids: list[str],
    *,
    lookup_batch_size: int,
    progress_every: int,
) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    total = len(source_ids)
    batches = (total + lookup_batch_size - 1) // lookup_batch_size
    for batch_idx, chunk in enumerate(_chunked(source_ids, lookup_batch_size), start=1):
        rows = client.get(
            collection_name=collection_name,
            partition_names=[workspace_id],
            ids=chunk,
            output_fields=["vector"],
        )
        for row in rows:
            rid = str(row.get("id", "")).strip()
            if rid:
                out[rid] = row
        if batch_idx == 1 or batch_idx % progress_every == 0 or batch_idx == batches:
            log.info(
                "Source fetch: batch %s/%s (%s/%s ids), matched %s source rows so far.",
                batch_idx,
                batches,
                min(batch_idx * lookup_batch_size, total),
                total,
                len(out),
            )
    return out


def reconcile(
    *,
    database_name: str,
    workspace_id: ObjectId,
    dry_run: bool,
    batch_size: int,
    lookup_batch_size: int,
    progress_every: int,
    limit: int,
) -> int:
    db = utils.connect(db=database_name)
    collection_name = _collection_name()
    workspace_partition = str(workspace_id)

    docs = _workspace_documents(db, workspace_id)
    if not docs:
        log.info("No workspace documents with metadata.source_id needing reconciliation.")
        return 0
    if limit > 0:
        docs = docs[:limit]
        log.info("Limiting reconciliation scope to first %s candidate documents.", len(docs))

    log.info(
        "Workspace %s: found %s Mongo documents with metadata.source_id candidates.",
        workspace_partition,
        len(docs),
    )

    client, db_override = connect_milvus_client()
    try:
        use_milvus_db(client, db_override)
        embeddings.milvus_setup(client, workspace_partition, collection_name=collection_name)
        use_milvus_db(client, db_override)
        client.load_partitions(
            collection_name=collection_name,
            partition_names=[workspace_partition],
        )

        existing_aliases = _existing_alias_ids(
            client,
            collection_name,
            workspace_partition,
            [row["mongo_id"] for row in docs],
            lookup_batch_size=lookup_batch_size,
            progress_every=progress_every,
        )
        pending = [row for row in docs if row["mongo_id"] not in existing_aliases]
        if not pending:
            log.info("All current Mongo ids already exist in Milvus for this partition.")
            return 0

        log.info(
            "Workspace %s: %s alias ids already present, %s still need reconciliation.",
            workspace_partition,
            len(existing_aliases),
            len(pending),
        )

        source_rows = _source_vectors(
            client,
            collection_name,
            workspace_partition,
            [row["source_id"] for row in pending],
            lookup_batch_size=lookup_batch_size,
            progress_every=progress_every,
        )

        upserts: list[dict[str, Any]] = []
        missing_source_ids: list[str] = []
        for row in pending:
            source_row = source_rows.get(row["source_id"])
            if not source_row:
                missing_source_ids.append(row["source_id"])
                continue
            upserts.append(
                {
                    "id": row["mongo_id"],
                    "vector": source_row["vector"],
                    "source_id": row["source_id"],
                }
            )

        log.info(
            "Workspace %s: matched %s source ids, missing %s source ids.",
            workspace_partition,
            len(upserts),
            len(missing_source_ids),
        )
        if missing_source_ids:
            sample = ", ".join(missing_source_ids[:10])
            more = "" if len(missing_source_ids) <= 10 else " ..."
            log.warning("Missing source ids in Milvus: %s%s", sample, more)

        if dry_run:
            log.info("[dry-run] Would upsert %s alias vectors into %s / %s.", len(upserts), collection_name, workspace_partition)
            return len(upserts)

        written = 0
        for chunk in _chunked(upserts, batch_size):
            use_milvus_db(client, db_override)
            client.upsert(
                collection_name=collection_name,
                partition_name=workspace_partition,
                data=chunk,
            )
            written += len(chunk)
            log.info("Upserted %s/%s alias vectors.", written, len(upserts))

        use_milvus_db(client, db_override)
        client.flush(collection_name=collection_name)
        log.info(
            "Done. Upserted %s alias vectors into collection=%s partition=%s.",
            written,
            collection_name,
            workspace_partition,
        )
        return written
    finally:
        try:
            client.close()
        except Exception:
            pass


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace-id", default="", help="Mongo workspace ObjectId / Milvus partition id.")
    parser.add_argument(
        "--demo-workspace",
        action="store_true",
        help="Resolve the workspace with label 'Demo corpus'.",
    )
    parser.add_argument(
        "--database",
        default=_database_name(),
        help="Mongo database name (default: MONGODB_DATABASE or teleoscope).",
    )
    parser.add_argument("--batch-size", type=int, default=500, help="Milvus upsert batch size.")
    parser.add_argument(
        "--lookup-batch-size",
        type=int,
        default=100,
        help="Milvus get() batch size for alias/source lookups (default: 100).",
    )
    parser.add_argument(
        "--progress-every",
        type=int,
        default=10,
        help="Log lookup progress every N batches (default: 10).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Only process the first N candidate documents (default: all).",
    )
    parser.add_argument("--dry-run", action="store_true", help="Preview work without writing to Milvus.")
    args = parser.parse_args()

    if bool(args.workspace_id) == bool(args.demo_workspace):
        raise SystemExit("Choose exactly one of --workspace-id or --demo-workspace.")

    db = utils.connect(db=args.database)
    if args.demo_workspace:
        workspace_id = _resolve_demo_workspace_id(db)
        log.info("Resolved demo workspace id: %s", workspace_id)
    else:
        workspace_id = ObjectId(args.workspace_id)

    return reconcile(
        database_name=args.database,
        workspace_id=workspace_id,
        dry_run=args.dry_run,
        batch_size=max(1, args.batch_size),
        lookup_batch_size=max(1, args.lookup_batch_size),
        progress_every=max(1, args.progress_every),
        limit=max(0, args.limit),
    )


if __name__ == "__main__":
    raise SystemExit(main())
