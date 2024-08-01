import os
import sys
import multiprocessing
from platform import system

# Set the multiprocessing start method at the very beginning
if system() == 'Darwin':  # macOS
    multiprocessing.set_start_method('spawn', force=True)
else:
    multiprocessing.set_start_method('fork', force=True)

from bson import ObjectId
import logging
import itertools
import uuid
from celery import Celery
from kombu import Exchange, Queue
from celery.signals import worker_process_init

from . import embeddings
from . import utils

from FlagEmbedding import BGEM3FlagModel

# Define a global model variable
model = None

# RabbitMQ connection details
RABBITMQ_USERNAME = os.getenv("RABBITMQ_USERNAME")
RABBITMQ_PASSWORD = os.getenv("RABBITMQ_PASSWORD")
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST")
RABBITMQ_VHOST = os.getenv("RABBITMQ_VHOST")
RABBITMQ_TASK_QUEUE = os.getenv("RABBITMQ_TASK_QUEUE")

# Broker URL for Celery
CELERY_BROKER_URL = (
    f"amqp://"
    f"{RABBITMQ_USERNAME}:"
    f"{RABBITMQ_PASSWORD}@"
    f"{RABBITMQ_HOST}/"
    f"{RABBITMQ_VHOST}"
)

# Queue and Celery app setup
queue = Queue("vectorizer", Exchange("vectorizer"), "vectorizer")
app = Celery("backend.vectorizer", backend="rpc://", broker=CELERY_BROKER_URL)

app.conf.update(
    task_serializer="pickle",
    accept_content=["pickle", "json"],  # Ignore other content
    result_serializer="pickle",
    task_queues=[queue],
    worker_concurrency=1,
)

@app.task
def milvus_chunk_import(database: str, userid: str, documents):
    client = embeddings.connect()
    embeddings.milvus_setup(client, collection_name=database)
    mongo_db = utils.connect(db=database)
    docs = mongo_db.documents.find(
        {"_id": {"$in": [ObjectId(str(d)) for d in documents]}}
    )
    data = vectorize(list(docs))
    res = client.upsert(collection_name=database, data=data)

@app.task
def milvus_import(
    *args,
    database: str,
    userid: str,
):
    client = embeddings.connect()
    embeddings.milvus_setup(client, collection_name=database)

    mongo_db = utils.connect(db=database)

    documents = mongo_db.documents.find({})
    for batch in itertools.batched(documents, 1000):
        data = vectorize(batch)
        res = client.upsert(collection_name=database, data=data)
    return res

@app.task
def update(database, documents):
    client = embeddings.connect()
    embeddings.milvus_setup(client, collection_name=database)
    data = vectorize(documents)
    client.upsert(collection_name=database, data=data)

@app.task
def vectorize(documents):
    ids = [str(doc["_id"]) for doc in documents]
    raw_embeddings = model.encode([doc["text"] for doc in documents])["dense_vecs"]
    embeddings = [embedding.tolist() for embedding in raw_embeddings]
    logging.info(f"{len(embeddings)} embeddings created.")
    data = [{"id": id_, "vector": embedding} for id_, embedding in zip(ids, embeddings)]
    return data

if __name__ == "__main__":

    if model is None:
        model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=True)

    worker = app.Worker(
        include=["backend.vectorizer"],
        hostname=f"vectorizer.{os.getlogin()}@%h{uuid.uuid4()}",
        loglevel="INFO",
    )
    worker.start()
    (
        [
            "worker",
            "--loglevel=INFO",
            f"--hostname=vectorizer.{os.getlogin()}@%h{uuid.uuid4()}",
        ]
    )
