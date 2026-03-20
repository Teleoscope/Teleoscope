#!/usr/bin/env python3
"""Import Teleoscope Milvus JSONL (from ``export_milvus_teleoscope.py``) into Milvus / Zilliz.

Each line must be a JSON object with ``id``, ``vector`` (1024 floats), and optional dynamic fields.
Lines produced by the export script also include ``collection`` and ``partition``; you can omit those
if you pass ``--default-collection`` and ``--default-partition``.

Connection: same as export — ``MILVUS_LITE_PATH``, ``MILVUS_URI`` + ``MILVUS_TOKEN``, or
``MILVUS_HOST`` / ``MIVLUS_PORT`` (see ``scripts/milvus_io_utils.py``).

Usage:
  PYTHONPATH=. python scripts/import_milvus_teleoscope.py --in ./milvus-backup/
  PYTHONPATH=. python scripts/import_milvus_teleoscope.py --in ./export.jsonl

  MILVUS_URI=https://....zillizcloud.com:19530 MILVUS_TOKEN='id:secret' \\
    PYTHONPATH=. python scripts/import_milvus_teleoscope.py --in ./export --batch-size 500
"""
from __future__ import annotations

import argparse
import gzip
import json
import logging
import os
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterator

from dotenv import load_dotenv

load_dotenv()

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = Path(__file__).resolve().parent
for _p in (REPO_ROOT, SCRIPTS_DIR):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

from milvus_io_utils import connect_milvus_client, use_milvus_db

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(message)s",
)
log = logging.getLogger("import_milvus")

VECTOR_DIM = 1024
META_KEYS = frozenset({"collection", "partition"})


def _is_jsonl_file(p: Path) -> bool:
    s = str(p)
    return s.endswith(".jsonl") or s.endswith(".jsonl.gz")


def resolve_input_files(inp: Path) -> list[Path]:
    if inp.is_file():
        if not _is_jsonl_file(inp):
            raise SystemExit(f"Not a JSONL file: {inp}")
        return [inp]
    if not inp.is_dir():
        raise SystemExit(f"Input path not found: {inp}")
    files = sorted(
        p for p in inp.iterdir() if p.is_file() and _is_jsonl_file(p)
    )
    if not files:
        raise SystemExit(f"No *.jsonl or *.jsonl.gz files in {inp}")
    return files


def iter_records(paths: list[Path]) -> Iterator[tuple[str, dict[str, Any]]]:
    for path in paths:
        opener = gzip.open if str(path).endswith(".gz") else open
        with opener(path, "rt", encoding="utf-8") as fp:
            for lineno, line in enumerate(fp, start=1):
                line = line.strip()
                if not line:
                    continue
                try:
                    yield f"{path}:{lineno}", json.loads(line)
                except json.JSONDecodeError as e:
                    raise SystemExit(f"{path}:{lineno}: invalid JSON: {e}") from e


def split_record(
    rec: dict[str, Any],
    default_collection: str | None,
    default_partition: str | None,
) -> tuple[str, str, dict[str, Any]]:
    coll = rec.get("collection") or default_collection
    part = rec.get("partition") or default_partition
    if not coll or not part:
        raise ValueError(
            "Each record needs collection/partition (or set --default-collection / --default-partition)"
        )
    data = {k: v for k, v in rec.items() if k not in META_KEYS}
    return str(coll), str(part), data


def validate_upsert_row(data: dict[str, Any], path_hint: str) -> None:
    if "id" not in data:
        raise ValueError(f"{path_hint}: missing id")
    if "vector" not in data:
        raise ValueError(f"{path_hint}: missing vector")
    vec = data["vector"]
    if not isinstance(vec, list) or len(vec) != VECTOR_DIM:
        ln = len(vec) if isinstance(vec, list) else None
        raise ValueError(
            f"{path_hint}: vector must be a list of length {VECTOR_DIM}, "
            f"got {type(vec).__name__} (len={ln})"
        )
    sid = str(data["id"])
    if len(sid) > 36:
        raise ValueError(
            f"{path_hint}: id length {len(sid)} exceeds Milvus schema (max 36)"
        )
    data["id"] = sid


def flush_batch(
    client,
    db_name: str | None,
    collection: str,
    partition: str,
    batch: list[dict[str, Any]],
    dry_run: bool,
) -> None:
    if not batch:
        return
    if dry_run:
        log.info("[dry-run] would upsert %s rows -> %s / %s", len(batch), collection, partition)
        return
    from backend import embeddings

    use_milvus_db(client, db_name)
    embeddings.milvus_setup(client, partition, collection_name=collection)
    use_milvus_db(client, db_name)
    client.upsert(
        collection_name=collection,
        data=batch,
        partition_name=partition,
    )
    log.info("Upserted %s rows -> collection=%s partition=%s", len(batch), collection, partition)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--in",
        dest="input_path",
        required=True,
        help="JSONL file or directory of *.jsonl / *.jsonl.gz (export output).",
    )
    parser.add_argument(
        "--default-collection",
        default=None,
        help="Collection name if missing on each line (default: from MILVUS_DBNAME or teleoscope).",
    )
    parser.add_argument(
        "--default-partition",
        default=None,
        help="Partition (workspace id) if missing on each line.",
    )
    parser.add_argument("--batch-size", type=int, default=500)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and log counts only; no writes.",
    )
    args = parser.parse_args()

    inp = Path(args.input_path)
    files = resolve_input_files(inp)

    default_coll = args.default_collection or os.getenv("MILVUS_DBNAME", "teleoscope").strip()
    default_part = args.default_partition

    client, db_override = connect_milvus_client()
    db_name = db_override or os.getenv("MILVUS_DBNAME", "teleoscope").strip()
    collections_flushed: set[str] = set()

    try:
        buffers: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
        total = 0

        for path_hint, rec in iter_records(files):
            try:
                coll, part, data = split_record(rec, default_coll, default_part)
            except ValueError as e:
                raise SystemExit(f"{path_hint}: {e}") from e
            validate_upsert_row(data, path_hint)
            key = (coll, part)
            buffers[key].append(data)
            total += 1
            if len(buffers[key]) >= args.batch_size:
                flush_batch(
                    client, db_name, coll, part, buffers[key], args.dry_run
                )
                collections_flushed.add(coll)
                buffers[key] = []

        for (coll, part), buf in buffers.items():
            if buf:
                flush_batch(client, db_name, coll, part, buf, args.dry_run)
                collections_flushed.add(coll)

        if not args.dry_run:
            use_milvus_db(client, db_name)
            for coll in collections_flushed:
                client.flush(collection_name=coll)
                log.info("Flushed collection %s", coll)

        log.info("Done. Records processed: %s", total)
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
