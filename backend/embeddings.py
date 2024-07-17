import logging
import itertools
from celery import Celery
from kombu import  Exchange, Queue
import uuid
import os
import hashlib

from warnings import simplefilter


from . import utils
from . import schemas

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
# simplefilter(action='ignore', category=FutureWarning)

def string_to_int(s):
    # Use hashlib to create a hash of the string
    hash_object = hashlib.sha256(s.encode())
    # Convert the hash to a hexadecimal string
    hex_dig = hash_object.hexdigest()
    # Convert the hexadecimal string to an integer
    return int(hex_dig, 16)

# # url: "amqp://myuser:mypassword@localhost:5672/myvhost"
# CELERY_BROKER_URL = (
#     f'amqp://'
#     f'{RABBITMQ_USERNAME}:'
#     f'{RABBITMQ_PASSWORD}@'
#     f'{RABBITMQ_HOST}/'
#     f'{RABBITMQ_VHOST}'
# )

# queue = Queue("embeddings", Exchange("embeddings"), "embeddings")
# app = Celery('backend.embeddings', backend='rpc://', broker=CELERY_BROKER_URL)

# app.conf.update(
#     task_serializer='pickle',
#     accept_content=['pickle', 'json'],  # Ignore other content
#     result_serializer='pickle',
#     task_queues=[queue],
#     worker_concurrency=1
# )

# MILVUS_HOST=localhost
# MIVLUS_PORT=19530
# MILVUS_USERNAME=test
# MILVUS_PASSWORD=Rj3eoQCb1LVp8nVq


# bge_m3_ef = model.hybrid.BGEM3EmbeddingFunction(
#     model_name='BAAI/bge-m3', # Specify t`he model name
#     device='cpu', # Specify the device to use, e.g., 'cpu' or 'cuda:0'
#     use_fp16=False # Whether to use fp16. `False` for `device='cpu'`.
# )

# sentence_transformer_ef = model.dense.SentenceTransformerEmbeddingFunction(
#     model_name='all-MiniLM-L6-v2', # Specify the model name
#     device='cpu' # Specify the device to use, e.g., 'cpu' or 'cuda:0'
# )   

from FlagEmbedding import BGEM3FlagModel
model = BGEM3FlagModel('BAAI/bge-m3', use_fp16=True) # Setting use_fp16 to True speeds up computation with a slight performance degradation
from pymilvus import connections, db, FieldSchema, utility, MilvusClient, Collection, CollectionSchema, DataType

def milvus_setup(client: MilvusClient):
    # dbs = db.list_database()
    # if MILVUS_DBNAME not in dbs:
    #     database = db.create_database(MILVUS_DBNAME)
    # else:
    #     db.using_database(MILVUS_DBNAME)

    if not client.has_collection("teleoscope"):
        # 2. Create schema
        # 2.1. Create schema
        schema = MilvusClient.create_schema(
            auto_id=False,
            enable_dynamic_field=True,
        )

        # 2.2. Add fields to schema
        schema.add_field(field_name="id", datatype=DataType.VARCHAR, max_length=36, is_primary=True)
        schema.add_field(field_name="vector", datatype=DataType.FLOAT_VECTOR, dim=1024)


        # id_field = FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, description="primary id")
        # embedding_field = FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=1024, description="vector")
        # schema = CollectionSchema(fields=[id_field, embedding_field], auto_id=False, enable_dynamic_field=True, description="desc of a collection")

        collection_name = "teleoscope"
        client.create_collection(
            collection_name=collection_name, 
            schema=schema, 
        )
        # collection = Collection(name=collection_name, schema=schema, using='default', shards_num=2)

        # 4.1. Set up the index parameters
        index_params = MilvusClient.prepare_index_params()

        # 4.2. Add an index on the vector field.
        index_params.add_index(
            field_name="vector",
            metric_type="COSINE",
            index_type="IVF_FLAT",
            index_name="vector_index",
            params={ "nlist": 1024 }
        )

        # 4.3. Create an index file
        client.create_index(
            collection_name=collection_name,
            index_params=index_params
        )
    


def milvus_import(*args, 
                database: str, 
                userid: str,
                ):
    # client = MilvusClient(uri="http://localhost:19530", db_name="teleoscope")
    client = MilvusClient(uri=f"http://{MILVUS_HOST}:{MIVLUS_PORT}", db_name=MILVUS_DBNAME)
    # conn = connections.connect(host=MILVUS_HOST, port=MIVLUS_PORT)
    milvus_setup(client)

    mongo_db = utils.connect(db=database)

    documents = mongo_db.documents.find({})
    
    # documents = [
    #     {
    #         "text": "Help",
    #         "vector": 1,
    #     }
    # ]

    for batch in itertools.batched(documents, 1000):
        ids = [str(doc["vector"]) for doc in batch]
        raw_embeddings = model.encode([doc['text'] for doc in batch])['dense_vecs']
        embeddings = [embedding.tolist() for embedding in raw_embeddings]

        logging.info(f"{len(embeddings)} embeddings created.")

        data = [{"id": id_, "vector": embedding} for id_, embedding in zip(ids, embeddings)]

        res = client.insert(collection_name="teleoscope", data=data)


# if __name__ == '__main__':
#     worker = app.Worker(
#         include=['backend.embeddings'],
#         hostname=f"embeddings.{os.getlogin()}@%h{uuid.uuid4()}",
#         loglevel="INFO"
#     )
#     worker.start()
    # (['worker', '--loglevel=INFO', f"--hostname=embeddings.{os.getlogin()}@%h{uuid.uuid4()}"])