import math
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq
from pymilvus import connections, Collection

MILVUS_URI = "http://localhost:19530"
COLLECTION_NAME = "reddit_posts"
OUT_DIR = Path("parquet_export")
BATCH_SIZE = 1000
ROWS_PER_FILE = 5000

def make_schema():
    return pa.schema([
        ("id", pa.string()),
        ("title", pa.string()),
        ("text", pa.string()),
        ("dense", pa.list_(pa.float32(), 1024)),
    ])

def write_part(rows, part_idx, out_dir, schema):
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"part-{part_idx:05d}.parquet"
    table = pa.Table.from_pylist(rows, schema=schema)
    pq.write_table(table, path, compression="zstd")
    print(f"wrote {path} ({len(rows)} rows)", flush=True)

def export_all():
    connections.connect(uri=MILVUS_URI)
    collection = Collection(COLLECTION_NAME)

    # load for query access
    collection.load()

    iterator = collection.query_iterator(
        batch_size=BATCH_SIZE,
        expr='id != ""',
        output_fields=["id", "title", "text", "combined_text", "dense"],
    )

    schema = make_schema()
    shard_rows = []
    total = 0
    part_idx = 0

    try:
        while True:
            batch = iterator.next()
            if not batch:
                break

            for row in batch:
                dense = row["dense"]
                row_out = {
                    "id": row["id"],
                    "title": row.get("title", ""),
                    "text": row.get("text", ""),
                    "combined_text": row.get("combined_text", ""),
                    "dense": [float(x) for x in dense],
                }
                shard_rows.append(row_out)
                total += 1

                if len(shard_rows) >= ROWS_PER_FILE:
                    write_part(shard_rows, part_idx, OUT_DIR / "full", schema)
                    shard_rows.clear()
                    part_idx += 1
                    print(f"exported {total} rows so far", flush=True)
    finally:
        iterator.close()

    if shard_rows:
        write_part(shard_rows, part_idx, OUT_DIR / "full", schema)

    print(f"done, exported {total} rows", flush=True)

if __name__ == "__main__":
    export_all()
