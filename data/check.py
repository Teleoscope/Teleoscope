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

from backend.milvus_script_connect import connect_milvus_script_client


def main() -> None:
    client = connect_milvus_script_client()
    try:
        print(client.list_collections())

        if client.has_collection("reddit_posts"):
            stats = client.get_collection_stats(collection_name="reddit_posts")
            print(stats)
    finally:
        try:
            client.close()
        except Exception:
            pass


if __name__ == "__main__":
    main()
