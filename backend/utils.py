# builtin modules
import json
import numpy as np
from tqdm import tqdm
import heapq
import re
import pika

# installed modules
from pymongo import MongoClient, database
import pymongo.errors
import logging 
from bson.objectid import ObjectId
from json import JSONEncoder
from typing import List
import datetime
import unicodedata

# local files
from . import auth
from . import schemas

db = "test"

def make_client():
    autht = "authSource=admin&authMechanism=SCRAM-SHA-256&tls=true"
    connect_str = (
        f'mongodb://'
        f'{auth.mongodb["username"]}:'
        f'{auth.mongodb["password"]}@'
        f'{auth.mongodb["host"]}/?{autht}'
    )
    client = MongoClient(
        connect_str, 
        connectTimeoutMS = 50000, 
        serverSelectionTimeoutMS = 50000,
        directConnection=True,
        replicaSet = "rs0"
        # read_preference = ReadPreference.PRIMARY_PREFERRED
    )
    # logging.log(f'Connected to MongoDB with user {auth.mongodb["username"]}.')
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
    res = db[collection_name].update_one({"_id": item_id},
        {"$push": {
                "history": {
                    "$each": [history_item],
                    "$position": 0
                }
            }}, session=transaction_session
    )
    return res

def mergeCollections():
    db = connect()
    cursor = db.clean.documents.v2.find({})
    for document in cursor:
        findres = list(db.documents.find({"_id": ObjectId(str(document["_id"]))}))
        if len(findres) == 0:
            print(document["_id"], "not found")
            db.documents.update_one({"_id": ObjectId(str(document["_id"]))}, {"$set": document}, upsert=True)
        else:
            print(document["_id"], "found")

# def update_embedding(q_vector, feedback_vector, feedback):
#     SENSITIVITY = 0.75
#     new_q = (1 - feedback * SENSITIVITY) * q_vector + feedback * SENSITIVITY * feedback_vector
#     return new_q


def moveVector(sourceVector, destinationVector, direction, magnitude):
    '''
    moveVector:
        sourceVector: current teleoscope search vector
        destinationVector: new documents vector
        direction: towards = 1, away = -1
        magnitude: weight of new vector

        returns: new query vector
        side effects: moves the query vector towards the feedback vector by a certain amount defined by sensitivity and then norms the vector to have unit length
    '''
    diff_q = destinationVector - sourceVector
    scaled_q = direction*magnitude*diff_q
    new_q = sourceVector + scaled_q
    new_q = new_q / np.linalg.norm(new_q)
    
    # logging.info(f'Magnitude: {magnitude}, difference: {sourceVector - new_q}, scaled_q: {scaled_q}.')

    return new_q

def getDocumentVector(db, document_id):
    document = db.documents.find_one({"_id": ObjectId(str(document_id))}, projection={'textVector':1}) # get document which was liked/disliked
    documentVector = np.array(document['textVector']) # extract vector of document which was liked/disliked
    return documentVector

def loadModel():
    import tensorflow_hub as hub
    model = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")
    return model

def getAllDocuments(db, projection, batching=True, batchSize=10000):
    if not batching:
        allDocuments = db.documents.find({}, projection=projection)
        allDocuments = list(allDocuments)
        return allDocuments
    
    # fetch all documents from mongodb in batches
    numSkip = 0 
    dataProcessed = 0
    allDocuments = []
    while True:
        batch = db.documents.find(projection=projection).skip(numSkip).limit(batchSize)
        batch = list(batch)
        # break if no more documents
        if len(batch) == 0:
            break
        allDocuments += batch
        dataProcessed += len(batch)
        logging.info(dataProcessed)
        print(dataProcessed)
        numSkip += batchSize
    
    return allDocuments

def calculateSimilarity(documentVectors, queryVector):
    '''Calculate similarity
    '''
    # cosine similarity scores. (assumes vectors are normalized to unit length)
    scores = queryVector.dot(documentVectors.T).flatten() 
    return scores

def rankDocumentsBySimilarity(documents_ids, scores):
    '''Create and return a list a tuples of (document_id, similarity_score) sorted by similarity score, high to low
    '''
    return sorted([(document_id, score) for (document_id, score) in zip(documents_ids, scores)], key=lambda x:x[1], reverse=True)



def rankDocumentsBySimilarity(document_ids, scores, n_top=1000):
    '''Create and return a list a tuples of (document_id, similarity_score) sorted by similarity score, high to low, keeping only the top N documents.

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


def cscUpload(db, namespace, csc):
    import gridfs
    from scipy.sparse import save_npz
    from io import BytesIO

    fs = gridfs.GridFS(db, namespace)
    
    data = BytesIO()
    save_npz(data, csc)
    data.seek(0)
    
    oid = fs.put(data)
    return oid

def cscDownload(db, namespace, oid):
    import gridfs
    from scipy.sparse import load_npz

    fs = gridfs.GridFS(db, namespace)
    csc = load_npz(fs.get(oid))
    return csc


def gridfsUpload(db, namespace, data, encoding='utf-8'):
    '''Uploads data to GridFS under a particular namespace.

    args:
        db: database connection object
        
        namespace: string that is used to identify GridFS, 
        i.e., namespace.chunks and namespace.files
        
        data: ordred list of tuples which are short string documentid and 
        float score [(string, float)] returned from rankDocumentsBySimilarity

    kwargs:    
        encoding: string representing text encoding

    returns:
        obj: MongoDB/BSON ObjectId()
    
    E.g.: 
        args: db=connect(), namespace="teleoscopes", data=[("v23oj1", 0.91), ... ]
        kwargs: 'utf-8'
        obj: ObjectId('62ce71d36fee6e2ed60d1fb5')
    '''
    import gridfs
    
    # subclass JSONEncoder
    class ObjectIdEncoder(JSONEncoder):
            def default(self, obj):
                if isinstance(obj, ObjectId):
                    return str(obj)
                return json.JSONEncoder.default(self, obj)

    dumps = json.dumps(data, cls=ObjectIdEncoder)

    fs = gridfs.GridFS(db, namespace)
    obj = fs.put(dumps, encoding=encoding)
    return obj

# Download from GridFS
def gridfsDownload(db, namespace, oid):
    '''Gets documents and scores from GridFS

    args:
        db: database connection object
        oid: MongoDB/BSON ObjectId
        namespace: string used to identify GridFS, i.e., namespace.chunks and namespace.files

    returns:
        data: ordred list of tuples which are short string documentid and 
        float score [(string, float)] as returned from rankDocumentsBySimilarity
    
    E.g.,:
        args:
            db=connect(), oid=ObjectId('62ce71d36fee6e2ed60d1fb5'), namespace="teleoscopes"
        data: [("v23oj1", 0.91), ... ]

    '''
    import gridfs
    fs = gridfs.GridFS(db, namespace)
    obj = fs.get(oid).read()
    data = json.loads(obj)
    return data


def update_ids():
    db = connect()
    groups = db.groups.find({})
    for group in groups:
        for history_item in group['history']:
            oid_arr = []
            for id in history_item['included_documents']:
                doc = db.documents.find_one({"id":id})
                if doc == None:
                    doc = db.documents.find_one({"_id": ObjectId(str(id))})
                oid = doc["_id"]
                oid_arr.append(oid)
            history_item['included_documents'] = oid_arr
        db.groups.update_one({"_id": group["_id"]}, { "$set": { "history": group["history"] } })


    sessions = db.sessions.find({})
    for session in sessions:
        for history_item in session['history']:
            oid_arr = []
            for id in history_item['bookmarks']:
                doc = db.documents.find_one({"id":id})
                if doc == None:
                    doc = db.documents.find_one({"_id": ObjectId(str(id))})
                oid = doc["_id"]
                oid_arr.append(oid)
            history_item['bookmarks'] = oid_arr
        db.sessions.update_one({"_id": session["_id"]}, { "$set": { "history": session["history"] } })

    teleoscopes = db.teleoscopes.find({})
    for teleoscope in teleoscopes:
        for history_item in teleoscope['history']:
            oid_arr = []
            for id in history_item['positive_docs']:
                doc = db.documents.find_one({"id":id})
                if doc == None:
                    doc = db.documents.find_one({"_id": ObjectId(str(id))})
                oid = doc["_id"]
                oid_arr.append(oid)
            history_item['positive_docs'] = oid_arr
            for id in history_item['negative_docs']:
                doc = db.documents.find_one({"id":id})
                if doc == None:
                    doc = db.documents.find_one({"_id": ObjectId(str(id))})
                oid = doc["_id"]
                oid_arr.append(oid)
            history_item['negative_docs'] = oid_arr
        db.teleoscopes.update_one({"_id": teleoscope["_id"]}, { "$set": { "history": teleoscope["history"] } })

def get_documents(dbstring, rebuild=False):
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

    count = db.documents.count_documents({})
    logging.info(f"Connected to database {dbstring}. There are {count} documents to retrieve.")

    logging.info(f"Aggregating documents...")
    documents = db.documents.aggregate(
        [
            # Only get IDs and vectors
            { "$project": { "textVector": 1, "_id": 1 }},
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
    credentials = pika.PlainCredentials(auth.rabbitmq["username"], auth.rabbitmq["password"])
    parameters = pika.ConnectionParameters(host='localhost', port=5672, virtual_host='teleoscope', credentials=credentials)
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