import logging
import os
import hashlib

from warnings import simplefilter

# environment variables
from dotenv import load_dotenv
load_dotenv()  # This loads the variables from .env
import os


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

from pymilvus import MilvusClient, DataType, MilvusException, connections, db


def milvus_setup(client: MilvusClient, collection_name="teleoscope"):
    logging.info(f"Checking if collection {collection_name} exists...")
    if not client.has_collection(collection_name):
        logging.info(f"Collection {collection_name} does not exist. Initializing...")
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
        logging.info(f"Initialized collection {collection_name}.")

def connect():
    client = None
    try:
        client = MilvusClient(uri=f"http://{MILVUS_HOST}:{MIVLUS_PORT}", db_name=MILVUS_DBNAME)
    except MilvusException as e:
        logging.info(f"Exception {e} when creating Milvus client.")
        connections.connect(uri=f"http://{MILVUS_HOST}:{MIVLUS_PORT}")
        database = db.create_database(MILVUS_DBNAME)
        connections.disconnect(f"http://{MILVUS_HOST}:{MIVLUS_PORT}")
        client = MilvusClient(uri=f"http://{MILVUS_HOST}:{MIVLUS_PORT}", db_name=MILVUS_DBNAME)
    return client


def get_embeddings(client, collection_name, oids):
    logging.info(f"Gathering document embeddings for {len(oids)} document oids...")
    # ensure the collection exists
    milvus_setup(client, collection_name=collection_name)

    # load the collection into memory
    client.load_collection(collection_name=collection_name)
    logging.info(f"Connected to Milvus Collection {collection_name}.")
    
    milvus_results = client.get(
        collection_name=collection_name, 
        ids=[str(i) for i in oids], 
        output_fields=["vector"]
    )
    return milvus_results

