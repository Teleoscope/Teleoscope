# builtin modules
import json
import numpy as np
from tqdm import tqdm
import heapq
import re
import pika
import os

# installed modules
from pymongo import MongoClient, database
import pymongo.errors
import logging 
from bson.objectid import ObjectId
from json import JSONEncoder
from typing import List
import datetime
import unicodedata
import chromadb
from chromadb import Documents, EmbeddingFunction, Embeddings
from chromadb.config import Settings
from chromadb.utils import embedding_functions


# local files
from . import schemas

# environment variables
from dotenv import load_dotenv
env_loaded = load_dotenv()  # This loads the variables from .env
if not env_loaded:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, '.env')
    load_dotenv(env_path)
import os

RABBITMQ_USERNAME = os.getenv('RABBITMQ_USERNAME') 
RABBITMQ_PASSWORD = os.getenv('RABBITMQ_PASSWORD') 
RABBITMQ_HOST = os.getenv('RABBITMQ_HOST') 

MONGODB_USERNAME = os.getenv('MONGODB_USERNAME')
MONGODB_PASSWORD = os.getenv('MONGODB_PASSWORD') 
MONGODB_HOST = os.getenv('MONGODB_HOST') 
MONGODB_AUTHT = os.getenv('MONGODB_AUTHT')
MONGODB_REPLICASET = os.getenv('MONGODB_REPLICASET')

CHROMA_HOST = os.getenv('CHROMA_HOST') 
CHROMA_PORT = os.getenv('CHROMA_PORT') 


db = "test"

def make_client():
    # autht = "authSource=admin&authMechanism=SCRAM-SHA-256&tls=true" Added this to config as: MONGODB_AUTHT
    connect_str = (
        f'mongodb://'
        f'{MONGODB_USERNAME}:'
        f'{MONGODB_PASSWORD}@'
        f'{MONGODB_HOST}/?'
        f'{MONGODB_AUTHT}'
    )
    client = MongoClient(
        connect_str, 
        connectTimeoutMS = 50000, 
        serverSelectionTimeoutMS = 50000,
        directConnection=True,
        replicaSet = MONGODB_REPLICASET
        # read_preference = ReadPreference.PRIMARY_PREFERRED
    )
    return client


def connect(db=db):
    client = make_client()
    return client[db]


def create_transaction_session(db=db):
    client = make_client()
    session = client.start_session()
    database = client[db]
    return session, database


def commit_with_retry(session, max_retries=10, retry_delay = 0.1):
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


def push_history(db, collection_name, item_id, history_item, transaction_session = None):
    """
    Update one document and push a history item.
    """
    db.history.insert_one({"collection": collection_name, "item": item_id, "history_item": history_item})
    res = db[collection_name].update_one({"_id": item_id},
        {
            "$set": {
                "history": [history_item],
            }
        }, session=transaction_session
    )
    return res


def calculateSimilarity(documentVectors, queryVector):
    '''Calculate similarity
    '''
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
    '''Create and return a list a tuples of (document_id, similarity_score) 
    sorted by similarity score, high to low, keeping only the top N documents.

    Args:
    document_ids (List): The list of document IDs. 
    scores (List): The corresponding similarity scores for each document. 
    n_top (int): The number of top documents to keep. Default is 1000.

    Returns:
    List[Tuple]: List of tuples, each containing a document_id and its corresponding similarity score, sorted in descending order by the similarity score, limited to the top N documents.
    '''
    scores_and_ids = zip(scores, document_ids)
    top_n = heapq.nlargest(n_top, scores_and_ids)
    top_n_sorted = sorted(top_n, key=lambda x: x[0], reverse=True)
    return [(doc_id, score) for score, doc_id in top_n_sorted]


def rank_document_ids_by_similarity(documents_ids, scores):
    '''Create and return a list a document ids sorted by similarity score, high to low
    '''
    return sorted([document_id for (document_id, score) in zip(documents_ids, scores)], key=lambda x:x[1], reverse=True)


def get_chroma_client():
    return chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT, settings=Settings(anonymized_telemetry=False))


def get_embeddings(dbstring, oids):
    chroma_client = get_chroma_client()
    chroma_collection = chroma_client.get_collection(dbstring)
    results = chroma_collection.get(ids=[str(oid) for oid in oids], include=["embeddings"])
    return results


def get_documents_chromadb(dbstring, limit):
    chroma_client = get_chroma_client()
    chroma_collection = chroma_client.get_collection(dbstring)
    results = chroma_collection.get(include=["embeddings"], limit=limit)
    return results


def get_documents(dbstring, rebuild=False, limit=None):
    if dbstring == "aita" or dbstring == "brands":
        get_documents_chromadb(dbstring, limit)

    # cache embeddings
    from pathlib import Path
    import pickle
    dir = Path(f'~/embeddings/{dbstring}/').expanduser()
    dir.mkdir(parents=True, exist_ok=True)
    npzpath = Path(f'~/embeddings/{dbstring}/embeddings.npz').expanduser()
    pklpath = Path(f'~/embeddings/{dbstring}/ids.pkl').expanduser()

    ids = []
    vectors = []

    if npzpath.exists() and pklpath.exists() and not rebuild:
        logging.info(f"Attempting to retrieve cached documents for {dbstring}.")
        
        loadDocuments = np.load(npzpath.as_posix(), allow_pickle=False)
        with open(pklpath.as_posix(), 'rb') as handle:
            ids = pickle.load(handle)
        vectors = loadDocuments['documents']

        if len(vectors) > 0 and len(ids) > 0 and len(vectors) == len(ids):
            return ids, vectors
        else:
            logging.info(f"Retrieving cached documents for {dbstring} failed.")

    logging.info(f"Building cache now for {dbstring} where rebuild is {rebuild}.")
    
    db = connect(db=dbstring)

    total_count = db.documents.count_documents({})
    count = db.documents.count_documents({"textVector": {"$size": 512}})
    logging.info(f"Connected to database {dbstring}. There are {count} documents with vectors and {total_count} left to vectorize.")

    logging.info(f"Aggregating documents...")
    documents = db.documents.aggregate(
        [
            # Filter documents where textVector has a size of 512
            { "$match": { "textVector": { "$size": 512 } } },

            # Only get IDs and vectors
            { "$project": { "textVector": 1, "_id": 1 } },

            # Ensure they're always in the same order
            { "$sort" : { "_id" : 1 } }
        ]
    )


    _ids = []
    _vecs = []

    logging.info(f"Retreiving documents...")
    for doc in tqdm(documents, total=count):
        _ids.append(doc["_id"])
        _vecs.append(doc["textVector"])
    vecs = np.array(_vecs)
    ids = _ids
    vectors = _vecs

    logging.info(f'There are {len(ids)} ids and {len(vecs)} vectors in {dbstring} documents.')
    
    np.savez(npzpath.as_posix(), documents=vecs)
    with open(pklpath.as_posix(), 'wb') as handle:
        pickle.dump(ids, handle, protocol=pickle.HIGHEST_PROTOCOL)
        
    return ids, vectors


def random_color():
    import random
    r = lambda: random.randint(0, 255)
    color = '#{0:02X}{1:02X}{2:02X}'.format(r(), r(), r())
    return color


def extract_special_characters(text):
    # Matches Emoji and other special Unicode characters
    return [c for c in text if not unicodedata.name(c).startswith(('LATIN', 'DIGIT', 'SPACE', 'PUNCTUATION'))]


def strip_emojis(text):
    return ''.join(c for c in text if unicodedata.name(c).startswith(('LATIN', 'DIGIT', 'SPACE', 'PUNCTUATION')))


def make_query(text):
    if len(text.strip()) == 0:
        return {}
    buffer = text.replace('"', '\\"').strip()
    regex = extract_special_characters(buffer)

    if len(regex) == 0:
        return { "$text": { "$search": buffer} }

    if len(strip_emojis(buffer)) == 0:
        return { "text": { "$regex": '|'.join(regex) } }

    return {
        "$and": [
            { "$text": { "$search": buffer } },
            { "text": { "$regex": '|'.join(regex) } }
        ]
    }

def message(queue: str, msg):
    credentials = pika.PlainCredentials(RABBITMQ_USERNAME, RABBITMQ_PASSWORD)
    parameters = pika.ConnectionParameters(host=RABBITMQ_HOST.split(":")[0], port=int(RABBITMQ_HOST.split(":")[1]), virtual_host='teleoscope', credentials=credentials)
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()
    channel.basic_publish(exchange='', routing_key=queue, body=json.dumps(msg))
    logging.info(f"Sent to queue {queue} and with message {json.dumps(msg)}.")


def get_collection(db: database.Database, node_type: schemas.NodeType):
    """Return the collection for a node type.
    """
    collection_map = {
        "Document": "documents",
        "Group": "groups",
        "Search": "searches",
        "Note": "notes",
        "Projection": "graph",
        "Intersection": "graph",
        "Exclusion": "graph",
        "Union": "graph",
        "Teleoscope": "graph",
    }

    return db.get_collection(collection_map[node_type])


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
    logging.info(f"There were {len(control_vecs)} control vecs and {len(source_vecs)} source vecs.")
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


def get_oids(db: database.Database, sources, exclude=[]):
    oids = []
    for c in sources:
        match c["type"]:
            case "Document":
                if not "Document" in exclude:
                    oids.append(c["id"])
            case "Group":
                if not "Group" in exclude:
                    group = db.groups.find_one({"_id": c["id"]})
                    oids = oids + group["history"][0]["included_documents"]
            case "Search":
                if not "Search" in exclude:
                    search = db.searches.find_one({"_id": c["id"]})
                    cursor = db.documents.find(make_query(search["history"][0]["query"]),projection={ "_id": 1})
                    oids = oids + [d["_id"] for d in list(cursor)]
            case "Note":
                if not "Note" in exclude:
                    oids.append(c["id"])
            case "Union":
                if not "Union" in exclude:
                    node = db.graph.find_one({"_id": c["id"]})
                    for doclist in node["doclists"]:
                            oids = oids + [d[0] for d in doclist["ranked_documents"]]
            case "Difference":
                if not "Difference" in exclude:
                    node = db.graph.find_one({"_id": c["id"]})
                    for doclist in node["doclists"]:
                            oids = oids + [d[0] for d in doclist["ranked_documents"]]
            case "Intersection": 
                if not "Intersection" in exclude:
                    node = db.graph.find_one({"_id": c["id"]})
                    for doclist in node["doclists"]:
                            oids = oids + [d[0] for d in doclist["ranked_documents"]]
            case "Exclusion":
                if not "Exclusion" in exclude:
                    node = db.graph.find_one({"_id": c["id"]})
                    for doclist in node["doclists"]:
                            oids = oids + [d[0] for d in doclist["ranked_documents"]]
    return oids


def get_vectors(db: database.Database, controls, ids, all_vectors):
    oids = []
    notes = []
    for c in controls:
        match c["type"]:
            case "Document":
                oids.append(c["id"])
            case "Group":
                group = db.groups.find_one({"_id": c["id"]})
                oids = oids + group["history"][0]["included_documents"]
            case "Search":
                search = db.searches.find_one({"_id": c["id"]})
                cursor = db.documents.find(make_query(search["history"][0]["query"]),projection={ "_id": 1})
                oids = oids + [d["_id"] for d in list(cursor)]
            case "Note":
                note = db.notes.find_one({"_id": c["id"]})
                notes.append(note)
            case "Union" | "Difference" | "Intersection" | "Exclusion":
                node = db.graph.find_one({"_id": c["id"]})
                for doclist in node["doclists"]:
                        oids = oids + [d[0] for d in doclist["ranked_documents"]]
                    
    note_vecs = [np.array(note["textVector"]) for note in notes]
    filtered_vecs = filter_vectors_by_oid(oids, ids, all_vectors)
    out_vecs = filtered_vecs + note_vecs
    logging.info(f"Got {len(oids)} as control vectors for controls {len(controls)}, with {len(ids)} ids and {len(all_vectors)} comparison vectors.")
    return out_vecs


def add_chromadb(dbstring, ids=[], texts=[], metadatas=None):
    chroma_client = get_chroma_client()
    default_ef = embedding_functions.DefaultEmbeddingFunction()
    chroma_collection = chroma_client.get_collection(dbstring, embedding_function=default_ef)
    chroma_collection.add(ids=[str(id) for id in ids], documents=texts, metadatas=metadatas)


def update_chromadb(dbstring, ids=[], texts=[], metadatas=None):
    chroma_client = get_chroma_client()
    default_ef = embedding_functions.DefaultEmbeddingFunction()
    chroma_collection = chroma_client.get_collection(dbstring, embedding_function=default_ef)
    chroma_collection.update(ids=[str(id) for id in ids], documents=texts, metadatas=metadatas)