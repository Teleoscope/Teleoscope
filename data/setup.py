import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))
try:
    from dotenv import load_dotenv

    load_dotenv(_REPO_ROOT / ".env", override=False)
except ImportError:
    pass

from pymilvus import MilvusClient, DataType

from backend.milvus_script_connect import connect_milvus_script_client


def main() -> None:
    client = connect_milvus_script_client()
    try:
        if client.has_collection("reddit_posts"):
            return

        schema = client.create_schema(
            auto_id=False,
            enable_dynamic_field=False,
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
            collection_name="reddit_posts",
            schema=schema,
            index_params=index_params,
        )
    finally:
        try:
            client.close()
        except Exception:
            pass


if __name__ == "__main__":
    main()
