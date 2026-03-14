from pathlib import Path

import pyarrow.parquet as pq
from pymilvus import MilvusClient, DataType

MILVUS_URI = "http://localhost:19530"
COLLECTION_NAME = "reddit_posts"
PARQUET_DIR = Path("parquet_export_dynamic")   # or parquet_out/full

client = MilvusClient(uri=MILVUS_URI)

# recreate collection only if needed
if not client.has_collection(COLLECTION_NAME):
    schema = client.create_schema(
        auto_id=False,
        enable_dynamic_fields=False,
    )

    schema.add_field(
        field_name="id",
        datatype=DataType.VARCHAR,
        is_primary=True,
        max_length=32,
    )
    schema.add_field(
        field_name="title",
        datatype=DataType.VARCHAR,
        max_length=2048,
    )
    schema.add_field(
        field_name="text",
        datatype=DataType.VARCHAR,
        max_length=65535,
    )
    schema.add_field(
        field_name="combined_text",
        datatype=DataType.VARCHAR,
        max_length=65535,
    )
    schema.add_field(
        field_name="dense",
        datatype=DataType.FLOAT_VECTOR,
        dim=1024,
    )

    index_params = MilvusClient.prepare_index_params()
    index_params.add_index(
        field_name="dense",
        index_name="dense_ivf_flat",
        index_type="IVF_FLAT",
        metric_type="COSINE",
        params={"nlist": 1024},
    )

    client.create_collection(
        collection_name=COLLECTION_NAME,
        schema=schema,
        index_params=index_params,
    )

for path in sorted(PARQUET_DIR.glob("part-*.parquet")):
    table = pq.read_table(path)
    rows = table.to_pylist()
    client.insert(collection_name=COLLECTION_NAME, data=rows)
    print(f"Inserted {len(rows)} rows from {path}")

client.flush(collection_name=COLLECTION_NAME)
client.load_collection(COLLECTION_NAME)

print("Done.")
