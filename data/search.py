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

from sentence_transformers import SentenceTransformer

from backend.milvus_script_connect import connect_milvus_script_client

COLLECTION_NAME = "reddit_posts"


def main() -> None:
    client = connect_milvus_script_client()
    try:
        model = SentenceTransformer("BAAI/bge-m3")

        query_doc = {
            "title": "AITA for keeping the office AC on?",
            "text": (
                "My coworkers complain that the office is too cold, "
                "but I have to wear a suit..."
            ),
        }

        query_text = f'{query_doc["title"]}\n\n{query_doc["text"]}'
        query_vec = model.encode(
            [query_text],
            normalize_embeddings=True,
        )[0].tolist()

        client.load_collection(collection_name=COLLECTION_NAME)
        results = client.search(
            collection_name=COLLECTION_NAME,
            data=[query_vec],
            anns_field="dense",
            search_params={"metric_type": "COSINE", "params": {"nprobe": 32}},
            limit=10,
            output_fields=["id", "title"],
        )

        for hit in results[0]:
            print(hit["entity"]["id"], hit["entity"]["title"], hit["distance"])
    finally:
        try:
            client.close()
        except Exception:
            pass


if __name__ == "__main__":
    main()
