# utils.py
# builtin modules
import numpy as np
import heapq
import os
import sys
import re
import json
import uuid
from threading import Lock

# installed modules
from pymongo import MongoClient, database
from bson.objectid import ObjectId
import logging
from typing import List
import datetime
import unicodedata

from pymilvus import connections, db, Collection

import pika 

# environment variables
from dotenv import load_dotenv
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, ".env")
if os.path.isfile(env_path):
    load_dotenv(env_path)  # This loads the variables from module .env
else:
    env_loaded = load_dotenv()  # This loads the variables from working directory .env


RABBITMQ_USERNAME = os.getenv("RABBITMQ_USERNAME", "guest")
RABBITMQ_PASSWORD = os.getenv("RABBITMQ_PASSWORD", "guest")
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_VHOST = os.getenv("RABBITMQ_VHOST", "/")
RABBITMQ_PORT = os.getenv("RABBITMQ_PORT", 5672)
RABBITMQ_DISPATCH_QUEUE = os.getenv("RABBITMQ_DISPATCH_QUEUE", "")
RABBITMQ_TASK_QUEUE = os.getenv("RABBITMQ_TASK_QUEUE", "")
RABBITMQ_EMBEDDINGS_QUEUE = os.getenv("RABBITMQ_EMBEDDINGS_QUEUE", "")
RABBITMQ_VECTORIZE_QUEUE = os.getenv("RABBITMQ_VECTORIZE_QUEUE", "")
RABBITMQ_UPLOAD_VECTOR_QUEUE = os.getenv("RABBITMQ_UPLOAD_VECTOR_QUEUE", "")

MONGODB_USERNAME = os.getenv("MONGODB_USERNAME")
MONGODB_PASSWORD = os.getenv("MONGODB_PASSWORD")
MONGODB_HOST = os.getenv("MONGODB_HOST")
MONGODB_OPTIONS = os.getenv("MONGODB_OPTIONS")
MONGODB_REPLICASET = os.getenv("MONGODB_REPLICASET")

CHROMA_HOST = os.getenv("CHROMA_HOST")
CHROMA_PORT = os.getenv("CHROMA_PORT")

MILVUS_HOST = os.getenv("MILVUS_HOST")
MILVUS_PORT = os.getenv("MILVUS_PORT")
MILVUS_DATABASE = os.getenv("MILVUS_DATABASE")


db = "test"


def make_client():
    # autht = "authSource=admin&authMechanism=SCRAM-SHA-256&tls=true" Added this to config as: MONGODB_AUTHT
    connect_str = (
        f"mongodb://"
        f"{MONGODB_USERNAME}:"
        f"{MONGODB_PASSWORD}@"
        f"{MONGODB_HOST}/?"
        f"{MONGODB_OPTIONS}"
    )
    client = MongoClient(
        connect_str,
        connectTimeoutMS=50000,
        serverSelectionTimeoutMS=50000,
        replicaSet=MONGODB_REPLICASET,
        # read_preference = ReadPreference.PRIMARY_PREFERRED
    )
    return client


def test_user(db):
    return db.users.find_one({"emails": "test@test.test"})

def test_team(db):
    return db.teams.find_one({"owner": test_user(db)["_id"]})

def test_workspace(db):
    return db.workspaces.find_one({"team": test_team(db)["_id"]})

def test_workflow(db):
    return db.workflows.find_one({"_id": test_workspace(db)["workflows"][0]})

def test_groups(db):
    return list(db.groups.find({"workspace":test_workspace(db)["_id"]}))

def test_data(db):
    """
    Examples:
        import backend.utils as utils
        db = utils.connect()
        pk = utils.test_package(db)
        user = utils.test_user(db)
        team = utils.test_team(db)
        workspace = utils.test_workspace(db)
        workflow = utils.test_workflow(db)
        groups = utils.test_groups(db)
        data = utils.test_data(db)
    """
    return {
        "user": test_user(db),
        "team": test_team(db),
        "workspace": test_workspace(db),
        "workflow": test_workflow(db),
        "groups": test_groups(db)
    }


def sanitize_filepath(filepath: str) -> str:
    # Replace any character that is not alphanumeric, '.', '_', '/', or '-' with an underscore
    sanitized = re.sub(r'[^\w\.\-/ ]', '_', filepath)  # First, replace weird characters with underscore
    sanitized = sanitized.replace(" ", "_")  # Then replace spaces with underscores
    return sanitized


def connect(db=db):
    client = make_client()
    return client[db]


def create_transaction_session(db=db):
    client = make_client()
    session = client.start_session()
    database = client[db]
    return session, database


def commit_with_retry(session, max_retries=10, retry_delay=0.1):
    import time

    try_count = 0
    success = False

    while try_count < max_retries and not success:
        try:
            session.commit_transaction()
            success = True
            logging.info("Transaction committed.")
        except:
            try_count += 1
            time.sleep(retry_delay)

    if not success:
        print("Error during commit ...")


def update_history(item, *args, **kwargs):
    item["timestamp"] = datetime.datetime.utcnow()
    for k in kwargs:
        item[k] = kwargs[k]
    return item


def push_history(db, collection_name, item_id, history_item, transaction_session=None):
    """
    Update one document and push a history item.
    """
    db.history.insert_one(
        {"collection": collection_name, "item": item_id, "history_item": history_item}
    )
    res = db[collection_name].update_one(
        {"_id": item_id},
        {
            "$set": {
                "history": [history_item],
            }
        },
        session=transaction_session,
    )
    return res


def calculateSimilarity(documentVectors, queryVector):
    """Calculate similarity"""
    # cosine similarity scores. (assumes vectors are normalized to unit length)
    if type(documentVectors) is list:
        arrays = [np.array(v) for v in documentVectors]
        documentVectors = np.vstack(arrays)
    scores = queryVector.dot(documentVectors.T).flatten()
    return scores


def rankDocumentsBySimilarityThreshold(document_ids, scores, threshold):
    scores_and_ids = zip(scores, document_ids)
    filtered = [sid for sid in scores_and_ids if sid[0] >= threshold]
    hipass = sorted(filtered, key=lambda x: x[0], reverse=True)
    return [(doc_id, score) for score, doc_id in hipass]


def rankDocumentsBySimilarity(document_ids, scores, n_top=1000):
    """Create and return a list a tuples of (document_id, similarity_score)
    sorted by similarity score, high to low, keeping only the top N documents.

    Args:
    document_ids (List): The list of document IDs.
    scores (List): The corresponding similarity scores for each document.
    n_top (int): The number of top documents to keep. Default is 1000.

    Returns:
    List[Tuple]: List of tuples, each containing a document_id and its corresponding similarity score, sorted in descending order by the similarity score, limited to the top N documents.
    """
    scores_and_ids = zip(scores, document_ids)
    top_n = heapq.nlargest(n_top, scores_and_ids)
    top_n_sorted = sorted(top_n, key=lambda x: x[0], reverse=True)
    return [(doc_id, score.item()) for score, doc_id in top_n_sorted]


def rank_document_ids_by_similarity(documents_ids, scores):
    """Create and return a list a document ids sorted by similarity score, high to low"""
    return sorted(
        [document_id for (document_id, score) in zip(documents_ids, scores)],
        key=lambda x: x[1],
        reverse=True,
    )


def connect_milvus():
    connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
    db.using_database(MILVUS_DATABASE)


def get_documents_milvus(dbstring, limit):
    connect_milvus()

    milvus_collection = Collection(dbstring)
    milvus_collection.load()

    logging.debug(f"Connected to Milvus Collection {milvus_collection}.")

    expression = f"oid > 0"
    results = milvus_collection.query(expr=expression, limit=limit)

    return [res["oid"] for res in results], [res["text_vector"] for res in results]


def get_documents(dbstring, rebuild=False, limit=None):
    return get_documents_milvus(dbstring, limit)


def random_color():
    import random

    r = lambda: random.randint(0, 255)
    color = "#{0:02X}{1:02X}{2:02X}".format(r(), r(), r())
    return color


def extract_special_characters(text):
    # Matches Emoji and other special Unicode characters
    return [
        c
        for c in text
        if not unicodedata.name(c).startswith(
            ("LATIN", "DIGIT", "SPACE", "PUNCTUATION")
        )
    ]


def strip_emojis(text):
    return "".join(
        c
        for c in text
        if unicodedata.name(c).startswith(("LATIN", "DIGIT", "SPACE", "PUNCTUATION"))
    )


def get_vector_ids(db, oids):
    return list(db.documents.find({"_id": {"$in": oids}}, projection={"vector": 1}))


def make_query(text):
    if len(text.strip()) == 0:
        return {}
    buffer = text.replace('"', '\\"').strip()
    regex = extract_special_characters(buffer)

    if len(regex) == 0:
        return {"$text": {"$search": buffer}}

    if len(strip_emojis(buffer)) == 0:
        return {"text": {"$regex": "|".join(regex)}}

    return {
        "$and": [{"$text": {"$search": buffer}}, {"text": {"$regex": "|".join(regex)}}]
    }


def binary_search(lst, number):
    left, right = 0, len(lst) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if lst[mid] < number:
            left = mid + 1
        else:
            right = mid - 1
    return left if left < len(lst) else -1


def filter_vectors_by_oid(oids, ids, vectors):
    # ids and vecs must correspond
    # vecs = [vectors[ids.index(oid)] for oid in oids]
    vecs = []
    for oid in oids:
        try:
            vecs.append(vectors[ids.index(oid)])
        except ValueError:
            continue

    return vecs


def rank(control_vecs, ids, source_vecs):
    logging.info(
        f"There were {len(control_vecs)} control vecs and {len(source_vecs)} source vecs."
    )
    vec = np.average(control_vecs, axis=0)
    scores = calculateSimilarity(source_vecs, vec)
    ranks = rankDocumentsBySimilarity(ids, scores)
    return ranks


def rank_similarity(control_vecs, ids, vecs, similarity):
    logging.info(f"There were {len(control_vecs)} control vecs.")
    vec = np.average(control_vecs, axis=0)
    scores = calculateSimilarity(vecs, vec)
    ranks = rankDocumentsBySimilarityThreshold(ids, scores, similarity)
    logging.info(f"Found {len(ranks)} documents at similarity {similarity}.")
    return ranks


def get_collection(db: database.Database, type):
    match type:
        case "Document":
            return db.documents
        case "Group":
            return db.groups
        case "Search":
            return db.searches
        case "Storage":
            return db.storage
        case "Note":
            return db.notes
        case "Rank" | "Union" | "Difference" | "Intersection" | "Exclusion":
            return db.graph


def get_oids(db: database.Database, source, exclude=["Note"]):
    if source["type"] in exclude:
        return []

    node = get_collection(db, source["type"]).find_one({"_id": source["reference"]})
    match source["type"]:
        case "Document":
            return [str(node["_id"])]
        case "Note":
            return [str(node["_id"])]
        case "Group":
            return [str(oid) for oid in node["docs"]]
        case "Storage":
            return [str(oid) for oid in node["docs"]]
        case "Search":
            cursor = db.documents.find(make_query(node["query"]), projection={"_id": 1})
            return [str(d["_id"]) for d in list(cursor)]
        case "Rank" | "Union" | "Difference" | "Intersection" | "Exclusion":
            return [
                str(d[0])
                for doclist in source["doclists"]
                for d in doclist["ranked_documents"]
            ]


def truncate_string(s, max_length):
    if len(s) > max_length:
        return s[:max_length - 3] + '...'
    return s


def get_doc_oids(db: database.Database, sources, exclude=["Note"]):
    sources = db.graph.find({"uid": {"$in": sources}})
    oids = []
    for source in sources:
        oids.extend(get_oids(db, source, exclude=exclude))
    return oids


def sanitize_db_name(name):
    # Remove forbidden characters
    forbidden_chars = " .$/\\"
    for char in forbidden_chars:
        name = name.replace(char, "_")

    # Ensure the name is not too long
    max_length = 63  # 64 bytes - 1 for safety
    if len(name.encode("utf-8")) > max_length:
        # Trim the name if it's too long, considering multibyte characters
        while len(name.encode("utf-8")) > max_length:
            name = name[:-1]

    # Ensure the name is not empty after removing forbidden characters
    if not name:
        raise ValueError("Database name cannot be empty after sanitization.")

    return name


def get_connection():
    """Create a new connection to RabbitMQ."""
    try:
        credentials = pika.PlainCredentials(
            username=RABBITMQ_USERNAME,
            password=RABBITMQ_PASSWORD
        )
        parameters = pika.ConnectionParameters(
            host=RABBITMQ_HOST,
            port=RABBITMQ_PORT,
            virtual_host=RABBITMQ_VHOST,
            credentials=credentials,
            heartbeat=600,  # Keepalive for long connections
            blocked_connection_timeout=3000,  # Optional timeout
            connection_attempts=5,  # Retry 5 times before giving up
            retry_delay=5,  # Delay in seconds between retries
        )
        return pika.BlockingConnection(parameters)
    
    except pika.exceptions.AuthenticationError as e:
        logging.error(f"Authentication failed: {e}")
        raise ConnectionError("RabbitMQ authentication failed.")
    
    except pika.exceptions.AMQPConnectionError as e:
        logging.error(f"Failed to connect to RabbitMQ: {e}")
        raise ConnectionError("Could not connect to RabbitMQ.")
    
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        raise ConnectionError("An unexpected error occurred.")


def publish(queue, message):
    """Publish a message to RabbitMQ."""
    connection = get_connection()  # Get a new connection each time
    try:
        channel = connection.channel()
        channel.queue_declare(queue=queue, durable=True)
        
        channel.basic_publish(
            exchange='',
            routing_key=queue,
            body=message,
            properties=pika.BasicProperties(
                delivery_mode=2,  # Make the message persistent
            )
        )
        logging.info(f"Message published to {queue}.")
    except Exception as e:
        logging.error(f"Failed to publish message to {queue}: {e}")
    finally:
        if connection.is_open:
            connection.close()  # Always clean up the connection


def ping(queue=RABBITMQ_DISPATCH_QUEUE, args=[], kwargs={}, message={"hello": "world"}):
    task_data = {
        "task": "ping",  # Celery task name
        "id": str(uuid.uuid4()),  # Unique ID for the task
        "args": args,  # Arguments for the task
        "kwargs": {
            "message": message,
            **kwargs
        },  # Keyword arguments if any
    }
    publish(queue, json.dumps(task_data))


def search_in_all_collections(db_name, search_value, field="_id"):
    # Connect to MongoDB (change URI if necessary)
    db = connect(db=db_name)

    if field == "_id":
        search_value = ObjectId(search_value)

    # Get all collection names in the database
    collections = db.list_collection_names()

    # Iterate through each collection and search for the value
    for collection_name in collections:
        collection = db[collection_name]
        # Perform a search query (you can adjust the field based on your data)
        query = { field: search_value }

        results = list(collection.find(query))

        if results:
            print(f"Found in collection '{collection_name}':")
            for result in results:
                print(result)
        else:
            print(f"No results found in collection '{collection_name}'")