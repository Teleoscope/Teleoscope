#!/usr/bin/env python3
"""
Milvus write-path smoke test for one-click setup: create ephemeral collection,
upsert one 1024-dim vector (app schema), flush, get, delete row, drop collection.

Env: same as workers (MILVUS_URI or MILVUS_HOST + port, auth, MILVUS_DBNAME, MILVUS_LITE_PATH).
Optional: MILVUS_SMOKE_COLLECTION (default teleoscope_one_click_smoke).
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parent.parent
if str(_REPO) not in sys.path:
    sys.path.insert(0, str(_REPO))

try:
    from dotenv import load_dotenv

    load_dotenv(_REPO / ".env", override=False)
except ImportError:
    pass

from pymilvus import DataType, MilvusClient

from backend.milvus_script_connect import connect_milvus_script_client

COLLECTION = (os.environ.get("MILVUS_SMOKE_COLLECTION") or "teleoscope_one_click_smoke").strip()
PARTITION = "smoke"
# Fixed UUID-shaped id (varchar pk max 36)
DOC_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"


def _drop_if_exists(client, name: str) -> None:
    if client.has_collection(name):
        client.drop_collection(name)


def _create_smoke_collection(client, name: str) -> None:
    schema = MilvusClient.create_schema(auto_id=False, enable_dynamic_field=True)
    schema.add_field(
        field_name="id",
        datatype=DataType.VARCHAR,
        max_length=36,
        is_primary=True,
    )
    schema.add_field(field_name="vector", datatype=DataType.FLOAT_VECTOR, dim=1024)
    client.create_collection(collection_name=name, schema=schema)
    index_params = MilvusClient.prepare_index_params()
    index_params.add_index(
        field_name="vector",
        metric_type="IP",
        index_type="IVF_FLAT",
        index_name="vector_index",
        params={"nlist": 1024},
    )
    client.create_index(collection_name=name, index_params=index_params)
    client.create_partition(collection_name=name, partition_name=PARTITION)


def main() -> int:
    print("Milvus smoke: connect…", flush=True)
    client = connect_milvus_script_client()
    try:
        _drop_if_exists(client, COLLECTION)
        print(f"Milvus smoke: create collection {COLLECTION!r} + upsert one row…", flush=True)
        _create_smoke_collection(client, COLLECTION)

        vec = [1.0 / 1024.0] * 1024
        client.upsert(
            collection_name=COLLECTION,
            partition_name=PARTITION,
            data=[{"id": DOC_ID, "vector": vec}],
        )
        client.flush(collection_name=COLLECTION)
        client.load_partitions(
            collection_name=COLLECTION,
            partition_names=[PARTITION],
        )

        rows = client.get(
            collection_name=COLLECTION,
            partition_names=[PARTITION],
            ids=[DOC_ID],
            output_fields=["vector"],
        )
        if not rows or len(rows) != 1:
            print(f"Milvus smoke: expected 1 row from get(), got {rows!r}", file=sys.stderr)
            return 1
        row0 = rows[0]
        got = row0.get("vector") if isinstance(row0, dict) else getattr(row0, "vector", None)
        if got is None or len(got) != 1024:
            print("Milvus smoke: vector field missing or wrong dim", file=sys.stderr)
            return 1

        client.delete(collection_name=COLLECTION, ids=[DOC_ID])
        client.flush(collection_name=COLLECTION)
        print("Milvus smoke: read-back OK, cleanup…", flush=True)
    except Exception as e:
        print(f"Milvus smoke failed: {e}", file=sys.stderr)
        return 1
    finally:
        try:
            _drop_if_exists(client, COLLECTION)
        except Exception:
            pass
        try:
            client.close()
        except Exception:
            pass

    print("Milvus smoke: OK (upsert, flush, get, delete, drop)", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
