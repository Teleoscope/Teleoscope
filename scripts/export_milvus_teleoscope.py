#!/usr/bin/env python3
"""Export Teleoscope Milvus collections to JSONL for backup or migration (e.g. Zilliz Cloud).

Reads the same vector layout the app uses: collection with partitions per workspace, fields
``id`` (VARCHAR PK), ``vector`` (FLOAT_VECTOR dim 1024), plus optional dynamic fields.

Connection (same idea as ``backend.embeddings``):
  - ``MILVUS_LITE_PATH`` — Milvus Lite file (local)
  - or ``MILVUS_URI`` — e.g. ``https://in01-....zillizcloud.com:19530`` (Zilliz)
  - or ``MILVUS_HOST`` + ``MIVLUS_PORT`` (Docker / self-hosted)
  - Optional auth: ``MILVUS_TOKEN`` (Zilliz API key / ``user:password``) or
    ``MILVUS_USERNAME`` + ``MILVUS_PASSWORD``

Usage (repo root; ``mamba activate teleoscope`` for pymilvus et al.; ``PYTHONPATH=.`` for ``backend`` imports):
  PYTHONPATH=. python scripts/export_milvus_teleoscope.py --out ./milvus-export
  PYTHONPATH=. python scripts/export_milvus_teleoscope.py \\
    --collection teleoscope --partition 674a... --out ./one-partition.jsonl

  # Zilliz (example)
  MILVUS_URI=https://....zillizcloud.com:19530 MILVUS_TOKEN=... \\
    PYTHONPATH=. python scripts/export_milvus_teleoscope.py --out ./export

To restore into another cluster, use ``import_milvus_teleoscope.py`` (same env vars).
"""
from __future__ import annotations

import argparse
import gzip
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Iterator

from dotenv import load_dotenv

load_dotenv()

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = Path(__file__).resolve().parent
for _p in (REPO_ROOT, SCRIPTS_DIR):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

from milvus_io_utils import connect_milvus_client, token_from_env, use_milvus_db

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(message)s",
)
log = logging.getLogger("export_milvus")

_orm_initialized = False


def _serialize_row(row: dict[str, Any]) -> dict[str, Any]:
    out = {}
    for k, v in row.items():
        if hasattr(v, "tolist"):
            out[k] = v.tolist()
        elif isinstance(v, (list, tuple)) and v and hasattr(v[0], "item"):
            out[k] = [x.item() if hasattr(x, "item") else float(x) for x in v]
        else:
            out[k] = v
    return out


def _iter_milvus_client(
    client,
    collection: str,
    partition: str,
    batch_size: int,
) -> Iterator[list[dict[str, Any]]]:
    """Yield batches of rows using MilvusClient.query_iterator when available."""
    try:
        from pymilvus import UNLIMITED
    except ImportError:
        UNLIMITED = -1

    client.load_partitions(collection_name=collection, partition_names=[partition])

    if not hasattr(client, "query_iterator"):
        raise AttributeError("query_iterator missing on MilvusClient")

    # Empty filter can yield no rows on some MilvusClient / server combos; match ORM fallback.
    kwargs: dict[str, Any] = {
        "collection_name": collection,
        "batch_size": batch_size,
        "filter": 'id != ""',
        "output_fields": ["*"],
        "limit": UNLIMITED,
        "partition_names": [partition],
    }
    try:
        it = client.query_iterator(**kwargs)
    except TypeError:
        # Older pymilvus: cannot scope iterator to a partition via MilvusClient; use ORM path.
        raise AttributeError("query_iterator lacks partition_names")

    try:
        while True:
            batch = it.next()
            if not batch:
                break
            yield batch
    finally:
        close = getattr(it, "close", None)
        if callable(close):
            close()


def _ensure_orm_connection(uri: str | None, token: str | None, db_name: str | None) -> None:
    """Single ORM connections.connect for all partition exports (fallback path)."""
    global _orm_initialized
    if _orm_initialized:
        return
    from pymilvus import connections

    uri = uri or (
        f"http://{os.getenv('MILVUS_HOST', 'localhost')}:{os.getenv('MIVLUS_PORT', '19530')}"
    )
    connections.connect("default", uri=uri, token=token)
    if db_name:
        try:
            from pymilvus import db as milvus_db

            milvus_db.using_database(db_name)
        except Exception as exc:
            log.warning("ORM using_database skipped: %s", exc)
    _orm_initialized = True


def _iter_collection_orm(
    collection: str,
    partition: str,
    batch_size: int,
    uri: str | None,
    token: str | None,
    db_name: str | None,
) -> Iterator[list[dict[str, Any]]]:
    """ORM Collection.query_iterator fallback (pymilvus 2.3-style)."""
    from pymilvus import Collection

    _ensure_orm_connection(uri, token, db_name)
    col = Collection(collection)
    col.load(partition_names=[partition])
    iterator = col.query_iterator(
        batch_size=batch_size,
        expr='id != ""',
        output_fields=["*"],
        partition_names=[partition],
    )
    try:
        while True:
            batch = iterator.next()
            if not batch:
                break
            yield batch
    finally:
        iterator.close()


def export_partition(
    client,
    db_name: str | None,
    collection: str,
    partition: str,
    batch_size: int,
    out_fp,
    uri: str | None,
    token: str | None,
) -> int:
    use_milvus_db(client, db_name)
    try:
        st = client.get_partition_stats(
            collection_name=collection, partition_name=partition
        )
        log.info("Partition %s stats: %s", partition, st)
        if isinstance(st, dict) and int(st.get("row_count", -1)) == 0:
            log.warning(
                "Partition %s has row_count 0. If you only rebuilt Mongo, vectors may never "
                "have been loaded into Milvus — re-run seed-demo-corpus / vectorization, or "
                "export another partition.",
                partition,
            )
    except Exception:
        pass
    count = 0

    def write_batch(batch: list[dict[str, Any]]) -> None:
        nonlocal count
        for row in batch:
            rec = {
                "collection": collection,
                "partition": partition,
                **_serialize_row(row),
            }
            out_fp.write(json.dumps(rec, ensure_ascii=False) + "\n")
            count += 1

    try:
        for batch in _iter_milvus_client(client, collection, partition, batch_size):
            write_batch(batch)
    except AttributeError:
        log.info("Falling back to ORM query_iterator for partition %s", partition)
        for batch in _iter_collection_orm(
            collection, partition, batch_size, uri, token, db_name
        ):
            write_batch(batch)

    return count


def list_partitions(client, db_name: str | None, collection: str) -> list[str]:
    use_milvus_db(client, db_name)
    parts = client.list_partitions(collection_name=collection)
    return [p for p in parts if p != "_default"]


def _is_jsonl_file_path(path: Path, gzip_out: bool) -> bool:
    s = str(path)
    if s.endswith(".jsonl"):
        return True
    return gzip_out and s.endswith(".jsonl.gz")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--out",
        required=True,
        help="Output path: a .jsonl file, or a directory (one file per partition).",
    )
    parser.add_argument(
        "--collection",
        default=os.getenv("MILVUS_COLLECTION")
        or os.getenv("MILVUS_DBNAME", "teleoscope"),
        help=(
            "Milvus collection name (default: MILVUS_COLLECTION, else MILVUS_DBNAME for "
            "backward compat, else teleoscope). MILVUS_DBNAME is the *database* name for "
            "MilvusClient, not the collection — use MILVUS_COLLECTION if they differ."
        ),
    )
    parser.add_argument(
        "--partition",
        action="append",
        dest="partitions",
        metavar="NAME",
        help="Partition to export (repeatable). Default: all non-_default partitions.",
    )
    parser.add_argument("--batch-size", type=int, default=500)
    parser.add_argument(
        "--gzip",
        action="store_true",
        help="Gzip the output file(s) (.gz appended if not present).",
    )
    parser.add_argument(
        "--include-default-partition",
        action="store_true",
        help="Also export Milvus _default partition if present.",
    )
    args = parser.parse_args()

    global _orm_initialized
    _orm_initialized = False

    out_path = Path(args.out)
    client, db_override = connect_milvus_client()
    uri = os.getenv("MILVUS_URI", "").strip() or None
    token = token_from_env()
    # Logical Milvus database for using_database (not the collection name).
    if db_override is not None:
        db_name = db_override
    else:
        db_name = os.getenv("MILVUS_DATABASE") or os.getenv("MILVUS_DBNAME", "teleoscope")
        db_name = str(db_name).strip() or "teleoscope"

    try:
        if args.partitions:
            partitions = args.partitions
        else:
            partitions = list_partitions(client, db_name, args.collection)
            if args.include_default_partition:
                all_p = client.list_partitions(collection_name=args.collection)
                for p in all_p:
                    if p == "_default" and p not in partitions:
                        partitions.append(p)

        if not partitions:
            log.warning("No partitions to export for collection %s.", args.collection)
            return 0

        total = 0
        if _is_jsonl_file_path(out_path, args.gzip):
            if out_path.is_dir():
                log.error("--out must not be a directory when using a .jsonl (or .jsonl.gz) path")
                return 1
            out_path.parent.mkdir(parents=True, exist_ok=True)
            opener = gzip.open if args.gzip else open
            path = out_path
            if args.gzip and not str(path).endswith(".gz"):
                path = Path(str(path) + ".gz")
            with opener(path, "wt", encoding="utf-8") as fp:
                for part in partitions:
                    n = export_partition(
                        client,
                        db_name,
                        args.collection,
                        part,
                        args.batch_size,
                        fp,
                        uri,
                        token,
                    )
                    log.info("Partition %s: %s rows", part, n)
                    total += n
        else:
            out_path.mkdir(parents=True, exist_ok=True)
            for part in partitions:
                safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in part)
                fname = f"{args.collection}__{safe}.jsonl"
                if args.gzip:
                    fname += ".gz"
                fpath = out_path / fname
                opener = gzip.open if args.gzip else open
                with opener(fpath, "wt", encoding="utf-8") as fp:
                    n = export_partition(
                        client,
                        db_name,
                        args.collection,
                        part,
                        args.batch_size,
                        fp,
                        uri,
                        token,
                    )
                log.info("Wrote %s (%s rows)", fpath, n)
                total += n

        meta = {
            "collection": args.collection,
            "partitions": partitions,
            "total_rows": total,
            "format": "jsonl",
            "gzip": args.gzip,
            "schema_note": "id (str), vector (list[float] len 1024), optional dynamic fields",
        }
        if out_path.is_dir():
            meta_path = out_path / "export_meta.json"
        elif _is_jsonl_file_path(out_path, args.gzip):
            base = str(out_path)
            if args.gzip and not base.endswith(".gz"):
                base = base + ".gz"
            meta_path = Path(base).parent / (Path(base).name + ".export_meta.json")
        else:
            meta_path = out_path / "export_meta.json"
        meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
        log.info("Wrote %s", meta_path)
        log.info("Done. Total rows: %s", total)
        return 0
    finally:
        client.close()
        if _orm_initialized:
            try:
                from pymilvus import connections

                connections.disconnect("default")
            except Exception:
                pass


if __name__ == "__main__":
    raise SystemExit(main())
