from pymilvus import MilvusClient
from sentence_transformers import SentenceTransformer

MILVUS_URI = "http://localhost:19530"
COLLECTION_NAME = "reddit_posts"

client = MilvusClient(uri=MILVUS_URI)
model = SentenceTransformer("BAAI/bge-m3")

query_doc = {
    "title": "AITA for keeping the office AC on?",
    "text": "My coworkers complain that the office is too cold, but I have to wear a suit..."
}

query_text = f'{query_doc["title"]}\n\n{query_doc["text"]}'
query_vec = model.encode(
    [query_text],
    normalize_embeddings=True,
)[0].tolist()

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