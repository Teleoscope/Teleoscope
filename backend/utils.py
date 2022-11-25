# builtin modules
import json
import numpy as np

# installed modules
from pymongo import MongoClient
import pymongo.errors
import logging 

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
    client = MongoClient(connect_str, connectTimeoutMS=50000, serverSelectionTimeoutMS = 50000)

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
    cursor = db.clean.posts.v2.find({})
    for post in cursor:
        findres = list(db.documents.find({"id": post["id"]}))
        if len(findres) == 0:
            print(post["id"], "not found")
            db.documents.update_one({"id": post["id"]}, {"$set": post}, upsert=True)
        else:
            print(post["id"], "found")

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

def getPostVector(db, post_id):
    post = db.documents.find_one({"id": post_id}, projection={'textVector':1}) # get post which was liked/disliked
    postVector = np.array(post['textVector']) # extract vector of post which was liked/disliked
    return postVector

def loadModel():
    import tensorflow_hub as hub
    model = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")
    return model

def getAllPosts(db, projection, batching=True, batchSize=10000):
    if not batching:
        allPosts = db.documents.find({}, projection=projection)
        allPosts = list(allPosts)
        return allPosts
    
    # fetch all posts from mongodb in batches
    numSkip = 0 
    dataProcessed = 0
    allPosts = []
    while True:
        batch = db.documents.find(projection=projection).skip(numSkip).limit(batchSize)
        batch = list(batch)
        # break if no more posts
        if len(batch) == 0:
            break
        allPosts += batch
        dataProcessed += len(batch)
        logging.info(dataProcessed)
        print(dataProcessed)
        numSkip += batchSize
    
    return allPosts

def calculateSimilarity(postVectors, queryVector):
    scores = queryVector.dot(postVectors.T).flatten() # cosine similarity scores. (assumes vectors are normalized to unit length)
    return scores

# create and return a list a tuples of (post_id, similarity_score) sorted by similarity score, high to low
def rankPostsBySimilarity(posts_ids, scores):
    return sorted([(post_id, score) for (post_id, score) in zip(posts_ids, scores)], key=lambda x:x[1], reverse=True)

# upload to GridFS
def gridfsUpload(db, namespace, data, encoding='utf-8'):
    '''Uploads data to GridFS under a particular namespace.

    args:
        db: database connection object
        
        namespace: string that is used to identify GridFS, 
        i.e., namespace.chunks and namespace.files
        
        data: ordred list of tuples which are short string postid and 
        float score [(string, float)] returned from rankPostsBySimilarity

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
    # convert to json
    dumps = json.dumps(data)
    fs = gridfs.GridFS(db, namespace)
    obj = fs.put(dumps, encoding=encoding)
    return obj

# Download from GridFS
def gridfsDownload(db, namespace, oid):
    '''Gets posts and scores from GridFS

    args:
        db: database connection object
        oid: MongoDB/BSON ObjectId
        namespace: string used to identify GridFS, i.e., namespace.chunks and namespace.files

    returns:
        data: ordred list of tuples which are short string postid and 
        float score [(string, float)] as returned from rankPostsBySimilarity
    
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
