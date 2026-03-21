import json
import sys
import time
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
from sentence_transformers import SentenceTransformer

from backend.milvus_script_connect import connect_milvus_script_client

COLLECTION_NAME = "reddit_posts"
JSONL_PATH = "documents.jsonl"

INSERT_BATCH_SIZE = 16
EMBED_BATCH_SIZE = 2
MAX_SEQ_LENGTH = 512


def log(msg: str):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def build_collection(client: MilvusClient):
    log("Checking collection...")

    if client.has_collection(COLLECTION_NAME):
        log(f"Collection {COLLECTION_NAME!r} already exists.")
        return

    log(f"Creating collection {COLLECTION_NAME!r}...")

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
    log("Collection created.")


def iter_jsonl(path: str):
    log(f"Opening JSONL: {path}")
    with open(path, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            if line.strip():
                try:
                    yield json.loads(line)
                except Exception as e:
                    log(f"JSON parse error at line {line_no}: {e}")
                    raise


def clean_text(s: str) -> str:
    return " ".join((s or "").split())


def make_combined_text(title: str, text: str) -> str:
    title = clean_text(title)
    text = clean_text(text)
    combined = f"{title}\n\n{text}" if title else text
    return combined[:12000]


def embed_rows(model, rows):
    texts = [row["combined_text"] for row in rows]
    log(f"Embedding {len(texts)} docs...")
    t0 = time.time()

    vectors = model.encode(
        texts,
        batch_size=EMBED_BATCH_SIZE,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )

    dt = time.time() - t0
    log(f"Embedding finished in {dt:.2f}s")

    for row, vec in zip(rows, vectors):
        row["dense"] = vec.tolist()

    return rows


def flush_batch(client, model, rows, total_seen):
    if not rows:
        return

    log(f"Flushing batch at total_seen={total_seen}, batch_size={len(rows)}")

    insert_data = embed_rows(model, rows)

    log("Starting Milvus insert...")
    t0 = time.time()
    result = client.insert(collection_name=COLLECTION_NAME, data=insert_data)
    dt = time.time() - t0
    log(f"Insert finished in {dt:.2f}s; result={result}")


def main():
    log("Connecting to Milvus...")
    client = connect_milvus_script_client()
    log("Connected to Milvus.")

    try:
        build_collection(client)

        log("Loading embedding model...")
        model = SentenceTransformer("BAAI/bge-m3", device="cpu")
        model.max_seq_length = MAX_SEQ_LENGTH
        log(f"Model loaded. max_seq_length={model.max_seq_length}")

        batch_rows = []
        total_seen = 0

        for doc in iter_jsonl(JSONL_PATH):
            total_seen += 1

            if total_seen <= 5:
                log(
                    f"Sample doc {total_seen}: id={doc.get('id')} "
                    f"title={repr((doc.get('title') or '')[:80])}"
                )

            title = (doc.get("title") or "").strip()
            text = (doc.get("text") or "").strip()
            combined_text = make_combined_text(title, text)

            batch_rows.append({
                "id": str(doc["id"]),
                "title": title[:2048],
                "text": text[:65535],
                "combined_text": combined_text[:65535],
            })

            if total_seen % 10 == 0:
                log(f"Read {total_seen} docs so far; current buffered rows={len(batch_rows)}")

            if len(batch_rows) >= INSERT_BATCH_SIZE:
                flush_batch(client, model, batch_rows, total_seen)
                batch_rows.clear()

        if batch_rows:
            log(f"Final batch with {len(batch_rows)} rows...")
            flush_batch(client, model, batch_rows, total_seen)

        log("Flushing Milvus segments...")
        client.flush(collection_name=COLLECTION_NAME)
        log("Loading collection into memory...")
        client.load_collection(collection_name=COLLECTION_NAME)
        log("Done.")
    finally:
        try:
            client.close()
        except Exception:
            pass


if __name__ == "__main__":
    main()