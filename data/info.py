import sys
from pathlib import Path
from pprint import pprint

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
        collections = client.list_collections()
        print(collections)

        for name in collections:
            print(f"\n=== {name} ===")
            pprint(client.describe_collection(collection_name=name))
    finally:
        try:
            client.close()
        except Exception:
            pass


if __name__ == "__main__":
    main()
