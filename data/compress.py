import json
import random
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

import pyarrow as pa
import pyarrow.parquet as pq
from pymilvus import MilvusClient, DataType
from sentence_transformers import SentenceTransformer

from backend.milvus_script_connect import connect_milvus_script_client

COLLECTION_NAME = "reddit_posts"
JSONL_PATH = "documents.jsonl"
OUT_DIR = Path("parquet_out")

INSERT_BATCH_SIZE = 16
EMBED_BATCH_SIZE = 2
MAX_SEQ_LENGTH = 512
PARQUET_ROWS_PER_FILE = 5000

random.seed(42)


def log(msg: str):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def build_collection(client: MilvusClient):
    if client.has_collection(COLLECTION_NAME):
        log(f"Collection {COLLECTION_NAME!r} already exists.")
        return

    schema = client.create_schema(auto_id=False, enable_dynamic_fields=False)

    schema.add_field("id", datatype=DataType.VARCHAR, is_primary=True, max_length=32)
    schema.add_field("title", datatype=DataType.VARCHAR, max_length=2048)
    schema.add_field("text", datatype=DataType.VARCHAR, max_length=65535)
    schema.add_field("combined_text", datatype=DataType.VARCHAR, max_length=65535)
    schema.add_field("dense", datatype=DataType.FLOAT_VECTOR, dim=1024)

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
    with open(path, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            if line.strip():
                yield json.loads(line)


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


class ShardedParquetWriter:
    def __init__(self, out_dir: Path, rows_per_file: int = 5000):
        self.out_dir = out_dir
        self.rows_per_file = rows_per_file
        self.out_dir.mkdir(parents=True, exist_ok=True)
        self.buffer = []
        self.part_idx = 0

        self.schema = pa.schema([
            ("id", pa.string()),
            ("title", pa.string()),
            ("text", pa.string()),
            ("combined_text", pa.string()),
            ("dense", pa.list_(pa.float32(), 1024)),
        ])

    def write_rows(self, rows):
        self.buffer.extend(rows)
        while len(self.buffer) >= self.rows_per_file:
            chunk = self.buffer[:self.rows_per_file]
            self._write_chunk(chunk)
            self.buffer = self.buffer[self.rows_per_file:]

    def flush(self):
        if self.buffer:
            self._write_chunk(self.buffer)
            self.buffer = []

    def _write_chunk(self, rows):
        path = self.out_dir / f"part-{self.part_idx:05d}.parquet"
        table = pa.Table.from_pylist(rows, schema=self.schema)
        pq.write_table(table, path, compression="zstd")
        log(f"Wrote parquet shard: {path} ({len(rows)} rows)")
        self.part_idx += 1


class ReservoirSampler:
    def __init__(self, k: int, seed: int = 42):
        self.k = k
        self.n = 0
        self.items = []
        self.rng = random.Random(seed)

    def add(self, item):
        self.n += 1
        if len(self.items) < self.k:
            self.items.append(item.copy())
        else:
            j = self.rng.randint(1, self.n)
            if j <= self.k:
                self.items[j - 1] = item.copy()


def write_sample(rows, path: Path):
    schema = pa.schema([
        ("id", pa.string()),
        ("title", pa.string()),
        ("text", pa.string()),
        ("combined_text", pa.string()),
        ("dense", pa.list_(pa.float32(), 1024)),
    ])
    table = pa.Table.from_pylist(rows, schema=schema)
    pq.write_table(table, path, compression="zstd")
    log(f"Wrote sample file: {path} ({len(rows)} rows)")


def flush_batch(client, model, rows, total_seen, parquet_writer, samplers):
    if not rows:
        return

    log(f"Flushing batch at total_seen={total_seen}, batch_size={len(rows)}")
    insert_data = embed_rows(model, rows)

    log("Starting Milvus insert...")
    t0 = time.time()
    result = client.insert(collection_name=COLLECTION_NAME, data=insert_data)
    dt = time.time() - t0
    log(f"Insert finished in {dt:.2f}s; result={result}")

    parquet_writer.write_rows(insert_data)

    for row in insert_data:
        for sampler in samplers:
            sampler.add(row)


def main():
    out_full = OUT_DIR / "full"
    out_samples = OUT_DIR / "samples"
    out_samples.mkdir(parents=True, exist_ok=True)

    client = connect_milvus_script_client()
    try:
        build_collection(client)

        model = SentenceTransformer("BAAI/bge-m3", device="cpu")
        model.max_seq_length = MAX_SEQ_LENGTH
        log(f"Model loaded. max_seq_length={model.max_seq_length}")

        parquet_writer = ShardedParquetWriter(out_full, rows_per_file=PARQUET_ROWS_PER_FILE)
        samplers = [
            ReservoirSampler(10, seed=42),
            ReservoirSampler(100, seed=43),
            ReservoirSampler(1000, seed=44),
        ]

        batch_rows = []
        total_seen = 0

        for doc in iter_jsonl(JSONL_PATH):
            total_seen += 1

            title = (doc.get("title") or "").strip()
            text = (doc.get("text") or "").strip()
            combined_text = make_combined_text(title, text)

            batch_rows.append({
                "id": str(doc["id"]),
                "title": title[:2048],
                "text": text[:65535],
                "combined_text": combined_text[:65535],
            })

            if total_seen % 100 == 0:
                log(f"Read {total_seen} docs so far; buffered={len(batch_rows)}")

            if len(batch_rows) >= INSERT_BATCH_SIZE:
                flush_batch(client, model, batch_rows, total_seen, parquet_writer, samplers)
                batch_rows.clear()

        if batch_rows:
            flush_batch(client, model, batch_rows, total_seen, parquet_writer, samplers)

        parquet_writer.flush()

        client.flush(collection_name=COLLECTION_NAME)
        log("Milvus flush finished.")

        write_sample(samplers[0].items, out_samples / "sample_10.parquet")
        write_sample(samplers[1].items, out_samples / "sample_100.parquet")
        write_sample(samplers[2].items, out_samples / "sample_1000.parquet")

        log("Done.")
    finally:
        try:
            client.close()
        except Exception:
            pass


if __name__ == "__main__":
    main()