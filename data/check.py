from pymilvus import MilvusClient

client = MilvusClient(uri="http://localhost:19530")

print(client.list_collections())

if client.has_collection("reddit_posts"):
    stats = client.get_collection_stats("reddit_posts")
    print(stats)