#!/usr/bin/env python3
"""Reconcile current Milvus ids with current Mongo document ids.

This maintenance script is intended for cases where Mongo documents have been
re-seeded or re-created, so their current ``_id`` no longer matches the Milvus
primary key used for previously loaded vectors. It reads Mongo documents for a
workspace, uses ``metadata.source_id`` to find the existing Milvus rows, and
upserts alias rows keyed by the current Mongo ``_id`` into the same Milvus
partition and collection schema.

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
    return (os.getenv("MILVUS_COLLECTION") or "reddit_posts").strip()


def _vector_field() -> str:
    return (os.getenv("MILVUS_VECTOR_FIELD") or "dense").strip()


def _copy_fields() -> list[str]:
    raw = (os.getenv("MILVUS_COPY_FIELDS") or "title,text,combined_text").strip()
    fields = [part.strip() for part in raw.split(",") if part.strip()]
    return fields


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


def _workspace_document_cursor(db, workspace_id: ObjectId):
    return db.documents.find(
        {"workspace": workspace_id, "metadata.source_id": {"$exists": True, "$ne": None}},
        {"_id": 1, "metadata.source_id": 1},
    ).sort("_id", 1)


def _normalized_doc_row(doc: dict[str, Any]) -> dict[str, str] | None:
    source_id = str((doc.get("metadata") or {}).get("source_id", "")).strip()
    mongo_id = str(doc["_id"])
    if not source_id:
        return None
    if source_id == mongo_id:
        return None
    return {"mongo_id": mongo_id, "source_id": source_id}


def _iter_workspace_documents(
    db,
    workspace_id: ObjectId,
    *,
    chunk_size: int,
    limit: int,
):
    cursor = _workspace_document_cursor(db, workspace_id)
    chunk: list[dict[str, str]] = []
    seen = 0
    for doc in cursor:
        row = _normalized_doc_row(doc)
        if row is None:
            continue
        chunk.append(row)
        seen += 1
        if limit > 0 and seen >= limit:
            yield chunk
            return
        if len(chunk) >= chunk_size:
            yield chunk
            chunk = []
    if chunk:
        yield chunk


def _count_workspace_documents(db, workspace_id: ObjectId, *, limit: int) -> int:
    count = 0
    cursor = _workspace_document_cursor(db, workspace_id)
    for doc in cursor:
        if _normalized_doc_row(doc) is None:
            continue
        count += 1
        if limit > 0 and count >= limit:
            return limit
    return count


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


def _source_rows(
    client,
    collection_name: str,
    source_ids: list[str],
    *,
    vector_field: str,
    copy_fields: list[str],
    lookup_batch_size: int,
    progress_every: int,
) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    total = len(source_ids)
    batches = (total + lookup_batch_size - 1) // lookup_batch_size
    for batch_idx, chunk in enumerate(_chunked(source_ids, lookup_batch_size), start=1):
        rows = client.get(
            collection_name=collection_name,
            ids=chunk,
            output_fields=[vector_field, *copy_fields],
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
    doc_chunk_size: int,
    lookup_batch_size: int,
    progress_every: int,
    limit: int,
) -> int:
    db = utils.connect(db=database_name)
    collection_name = _collection_name()
    vector_field = _vector_field()
    copy_fields = _copy_fields()
    workspace_partition = str(workspace_id)

    total_candidates = _count_workspace_documents(db, workspace_id, limit=limit)
    if total_candidates == 0:
        log.info("No workspace documents with metadata.source_id needing reconciliation.")
        return 0
    if limit > 0:
        log.info("Limiting reconciliation scope to first %s candidate documents.", total_candidates)

    log.info(
        "Workspace %s: found %s Mongo documents with metadata.source_id candidates.",
        workspace_partition,
        total_candidates,
    )

    client, db_override = connect_milvus_client()
    try:
        use_milvus_db(client, db_override)
        if not client.has_collection(collection_name):
            raise SystemExit(
                f"Milvus collection {collection_name!r} does not exist. "
                "Set MILVUS_COLLECTION to the current collection name before running this script."
            )
        use_milvus_db(client, db_override)
        client.load_partitions(
            collection_name=collection_name,
            partition_names=[workspace_partition],
        )

        total_seen = 0
        total_existing_aliases = 0
        total_missing_source_ids = 0
        total_upserts = 0

        for chunk_idx, docs_chunk in enumerate(
            _iter_workspace_documents(
                db,
                workspace_id,
                chunk_size=doc_chunk_size,
                limit=limit,
            ),
            start=1,
        ):
            total_seen += len(docs_chunk)
            log.info(
                "Chunk %s: processing %s candidate docs (%s/%s seen).",
                chunk_idx,
                len(docs_chunk),
                total_seen,
                total_candidates,
            )

            existing_aliases = _existing_alias_ids(
                client,
                collection_name,
                workspace_partition,
                [row["mongo_id"] for row in docs_chunk],
                lookup_batch_size=lookup_batch_size,
                progress_every=progress_every,
            )
            total_existing_aliases += len(existing_aliases)
            pending = [row for row in docs_chunk if row["mongo_id"] not in existing_aliases]
            if not pending:
                log.info("Chunk %s: all docs already reconciled.", chunk_idx)
                continue

            source_rows = _source_rows(
                client,
                collection_name,
                [row["source_id"] for row in pending],
                vector_field=vector_field,
                copy_fields=copy_fields,
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
                upsert_row = {"id": row["mongo_id"], vector_field: source_row[vector_field]}
                for field in copy_fields:
                    if field in source_row:
                        upsert_row[field] = source_row[field]
                upserts.append(upsert_row)

            total_missing_source_ids += len(missing_source_ids)
            total_upserts += len(upserts)
            log.info(
                "Chunk %s: matched %s source ids, missing %s source ids.",
                chunk_idx,
                len(upserts),
                len(missing_source_ids),
            )
            if missing_source_ids:
                sample = ", ".join(missing_source_ids[:10])
                more = "" if len(missing_source_ids) <= 10 else " ..."
                log.warning("Chunk %s missing source ids: %s%s", chunk_idx, sample, more)

            if dry_run:
                log.info(
                    "[dry-run] Chunk %s would upsert %s alias vectors into %s / %s.",
                    chunk_idx,
                    len(upserts),
                    collection_name,
                    workspace_partition,
                )
                continue

            chunk_written = 0
            for upsert_chunk in _chunked(upserts, batch_size):
                use_milvus_db(client, db_override)
                client.upsert(
                    collection_name=collection_name,
                    partition_name=workspace_partition,
                    data=upsert_chunk,
                )
                chunk_written += len(upsert_chunk)
                log.info(
                    "Chunk %s: upserted %s/%s alias vectors.",
                    chunk_idx,
                    chunk_written,
                    len(upserts),
                )

            log.info("Chunk %s complete.", chunk_idx)

        if not dry_run:
            use_milvus_db(client, db_override)
            client.flush(collection_name=collection_name)
        log.info(
            "Done. existing_aliases=%s, upserts=%s, missing_source_ids=%s into collection=%s partition=%s.",
            total_existing_aliases,
            total_upserts,
            total_missing_source_ids,
            collection_name,
            workspace_partition,
        )
        return total_upserts
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
        "--doc-chunk-size",
        type=int,
        default=2000,
        help="Mongo document chunk size to process in memory at once (default: 2000).",
    )
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
        doc_chunk_size=max(1, args.doc_chunk_size),
        lookup_batch_size=max(1, args.lookup_batch_size),
        progress_every=max(1, args.progress_every),
        limit=max(0, args.limit),
    )


if __name__ == "__main__":
    raise SystemExit(main())
