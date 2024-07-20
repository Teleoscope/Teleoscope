import logging
import itertools
from celery import Celery
from kombu import  Exchange, Queue
import uuid
import os
import hashlib

from warnings import simplefilter

from . import utils

# environment variables
from dotenv import load_dotenv
load_dotenv()  # This loads the variables from .env
import os
RABBITMQ_USERNAME = os.getenv('RABBITMQ_USERNAME')
RABBITMQ_PASSWORD = os.getenv('RABBITMQ_PASSWORD')
RABBITMQ_HOST = os.getenv('RABBITMQ_HOST')
RABBITMQ_VHOST = os.getenv('RABBITMQ_VHOST')
RABBITMQ_TASK_QUEUE = os.getenv('RABBITMQ_TASK_QUEUE')

MILVUS_HOST = os.getenv("MILVUS_HOST")
MIVLUS_PORT = os.getenv("MIVLUS_PORT")
MILVUS_USERNAME = os.getenv("MILVUS_USERNAME")
MILVUS_PASSWORD = os.getenv("MILVUS_PASSWORD")
MILVUS_DBNAME = os.getenv("MILVUS_DBNAME")


# ignore all future warnings
simplefilter(action='ignore', category=FutureWarning)

def string_to_int(s):
    # Use hashlib to create a hash of the string
    hash_object = hashlib.sha256(s.encode())
    # Convert the hash to a hexadecimal string
    hex_dig = hash_object.hexdigest()
    # Convert the hexadecimal string to an integer
    return int(hex_dig, 16)

# url: "amqp://myuser:mypassword@localhost:5672/myvhost"
CELERY_BROKER_URL = (
    f'amqp://'
    f'{RABBITMQ_USERNAME}:'
    f'{RABBITMQ_PASSWORD}@'
    f'{RABBITMQ_HOST}/'
    f'{RABBITMQ_VHOST}'
)

queue = Queue("embeddings", Exchange("embeddings"), "embeddings")
app = Celery('backend.embeddings', backend='rpc://', broker=CELERY_BROKER_URL)

app.conf.update(
    task_serializer='pickle',
    accept_content=['pickle', 'json'],  # Ignore other content
    result_serializer='pickle',
    task_queues=[queue],
    worker_concurrency=1
)

from FlagEmbedding import BGEM3FlagModel
model = BGEM3FlagModel('BAAI/bge-m3', use_fp16=True) # Setting use_fp16 to True speeds up computation with a slight performance degradation
from pymilvus import MilvusClient, DataType

def milvus_setup(client: MilvusClient, collection_name="teleoscope"):
    if not client.has_collection(collection_name):
        # 2. Create schema
        # 2.1. Create schema
        schema = MilvusClient.create_schema(
            auto_id=False,
            enable_dynamic_field=True,
        )

        # 2.2. Add fields to schema
        schema.add_field(field_name="id", datatype=DataType.VARCHAR, max_length=36, is_primary=True)
        schema.add_field(field_name="vector", datatype=DataType.FLOAT_VECTOR, dim=1024)

        client.create_collection(
            collection_name=collection_name, 
            schema=schema, 
        )

        # 4.1. Set up the index parameters
        index_params = MilvusClient.prepare_index_params()

        # 4.2. Add an index on the vector field.
        index_params.add_index(
            field_name="vector",
            metric_type="IP",
            index_type="IVF_FLAT",
            index_name="vector_index",
            params={ "nlist": 1024 }
        )

        # 4.3. Create an index file
        client.create_index(
            collection_name=collection_name,
            index_params=index_params
        )

def connect():
    client = MilvusClient(uri=f"http://{MILVUS_HOST}:{MIVLUS_PORT}", db_name=MILVUS_DBNAME)
    return client

def milvus_import(*args, 
                database: str, 
                userid: str,
                ):
    # client = MilvusClient(uri="http://localhost:19530", db_name="teleoscope")
    client = connect()
    milvus_setup(client, collection_name=database)

    mongo_db = utils.connect(db=database)

    documents = mongo_db.documents.find({})
    
    for batch in itertools.batched(documents, 1000):
        ids = [str(doc["_id"]) for doc in batch]
        raw_embeddings = model.encode([doc['text'] for doc in batch])['dense_vecs']
        embeddings = [embedding.tolist() for embedding in raw_embeddings]

        logging.info(f"{len(embeddings)} embeddings created.")

        data = [{"id": id_, "vector": embedding} for id_, embedding in zip(ids, embeddings)]

        res = client.insert(collection_name=database, data=data)
    return res


if __name__ == '__main__':
    worker = app.Worker(
        include=['backend.embeddings'],
        hostname=f"embeddings.{os.getlogin()}@%h{uuid.uuid4()}",
        loglevel="INFO"
    )
    worker.start()
    (['worker', '--loglevel=INFO', f"--hostname=embeddings.{os.getlogin()}@%h{uuid.uuid4()}"])