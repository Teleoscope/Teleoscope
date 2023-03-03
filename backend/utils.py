# builtin modules
import json
import numpy as np

# installed modules
from pymongo import MongoClient
import pymongo.errors
import logging 
from bson.objectid import ObjectId
from json import JSONEncoder

# local files
import auth

def connect():
    autht = "authSource=admin&authMechanism=SCRAM-SHA-256"
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
    return client.aita

def create_transaction_session():
    autht = "authSource=admin&authMechanism=SCRAM-SHA-256"
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
    session = client.start_session()
    db = client.aita
    return session, db

def commit_with_retry(session):
    while True:
        try:
            # Commit uses write concern set at transaction start.
            session.commit_transaction()
            print("Transaction committed.")
            break
        except (pymongo.errors.ConnectionFailure, pymongo.errors.OperationFailure) as exc:
            # Can retry commit
            if exc.has_error_label("UnknownTransactionCommitResult"):
                print("UnknownTransactionCommitResult, retrying "
                      "commit operation ...")
                continue
            else:
                print("Error during commit ...")
                raise


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
    logging.info(f'Magnitude: {magnitude}, difference: {sourceVector - new_q}, scaled_q: {scaled_q}.')

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
