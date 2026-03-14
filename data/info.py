from pymilvus import MilvusClient
from pprint import pprint

client = MilvusClient(uri="http://localhost:19530")

collections = client.list_collections()
print(collections)

for name in client.list_collections():
    print(f"\n=== {name} ===")
    pprint(client.describe_collection(collection_name=name))
