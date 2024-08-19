from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List
from FlagEmbedding import BGEM3FlagModel
import logging
from queue import Queue
import signal
import sys

from . import embeddings

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

app = FastAPI()
request_queue = Queue()

def shutdown_handler(sig, frame):
    logging.info("Shutting down...")
    # Perform any cleanup here
    sys.exit(0)

# Register the shutdown handler
signal.signal(signal.SIGINT, shutdown_handler)
signal.signal(signal.SIGTERM, shutdown_handler)

# Load the model once at startup
model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=True)
logging.info("Model loaded successfully.")

# Define request and response data models
class Document(BaseModel):
    id: str
    text: str

class DocumentRequest(BaseModel):
    documents: List[Document]
    database: str

@app.post("/vectorize")
async def queue_request(req: DocumentRequest, background_tasks: BackgroundTasks):
    # Add the request to the queue
    request_queue.put(req)
    # Add a background task to process requests
    background_tasks.add_task(process_requests)
    return {
        "status": "queued",
        "message": f"Your request to vectorize {len(req.documents)} for {req.database} is being processed.",
    }

def process_requests():
    while not request_queue.empty():
        req = request_queue.get()
        try:
            vectorize(req)
        except Exception as e:
            logging.error(f"Error processing request: {e}")

def vectorize(req: DocumentRequest):
    documents = req.documents
    database = req.database

    client = embeddings.connect()
    embeddings.milvus_setup(client, collection_name=database)
    logging.info(f"Received {len(documents)} documents.")

    try:
        texts = [doc.text for doc in documents]

        logging.info(f"Vectorizing {len(documents)} documents...")
        raw_vecs = model.encode(texts)["dense_vecs"]
        logging.info(f"Vectorized {len(documents)} documents.")

        vecs = [vec.tolist() for vec in raw_vecs]

        data = [{"id": doc.id, "vector": vec} for doc, vec in zip(documents, vecs)]

        res = client.upsert(collection_name=database, data=data)
        client.close()
        logging.info(f"Uploaded {len(data)} vectors to Milvus.")
        return res

    except Exception as e:
        logging.error(f"Error during vectorization: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
