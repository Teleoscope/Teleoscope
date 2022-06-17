# builtin modules
import pickle
import tensorflow_hub as hub
import numpy as np
# installed modules
from pymongo import MongoClient
import gridfs
from tqdm import tqdm
import logging 

import gensim.downloader as api
from gensim.corpora import Dictionary
from gensim.similarities import WordEmbeddingSimilarityIndex
from gensim.similarities import SparseTermSimilarityMatrix
from gensim.similarities import SoftCosineSimilarity
from gensim.utils import simple_preprocess

# local files
import auth

def unpacker(cursor, key):
    for doc in cursor:
        yield doc[key]


def connect():
    # client = MongoClient('127.0.0.1:27017',
    #             username=auth.u,
    #             password=auth.p,
    #             authSource='aita',
    #             authMechanism='SCRAM-SHA-256')
    autht = "authSource=aita&authMechanism=SCRAM-SHA-256"
    connect_str = (
        f'mongodb://'
        f'{auth.mongodb["username"]}:'
        f'{auth.mongodb["password"]}@'
        f'{auth.mongodb["host"]}/?{autht}'
    )
    client = MongoClient(connect_str, connectTimeoutMS=50000, serverSelectionTimeoutMS = 50000)
    return client.aita


# list(mongodb docs) -> list(str)
def redditids(results):
    ids = [r["id"] for r in results]
    return ids


# list(mongodb docs) -> list(list(str))
def preprocess(results):
    selftext_only = [simple_preprocess(d["selftext"]) for d in results]
    return selftext_only


# str -> query
def query(s):
    mdb_query = {"$text": {"$search": s}}
    return mdb_query


# query -> docs
def find(_query):
    db = connect()
    print("asdf")
    count = db.posts.count(_query)
    cursor = tqdm(db.posts.find(_query), total=count)
    results = list(cursor)
    return results


# docs -> dictionary
def dictionary(docs):
    _dictionary = Dictionary(docs)
    return _dictionary


# docs, dictionary -> corpus
def corpus(docs, _dictionary):
    bow_corpus = [_dictionary.doc2bow(doc) for doc in docs]
    return bow_corpus


# str -> model
def load(uri):
    model = api.load(uri)
    similarity_index = WordEmbeddingSimilarityIndex(model)
    return similarity_index


# model, _dictionary -> sparse term similarity matrix
def sparse_tsm(model, _dictionary):
    similarity_matrix = SparseTermSimilarityMatrix(model, _dictionary)
    return similarity_matrix


# bow_corpus, sparseTSM, int -> soft cos sim index
def soft_cos_sim(bow_corpus, similarity_matrix, n=100):
    scs = SoftCosineSimilarity(bow_corpus, similarity_matrix, num_best=n)
    return scs


# dictionary, str -> bow
def bow(_dictionary, doc):
    ret = _dictionary.doc2bow(doc.lower().split())
    return ret


# _dictionary, str -> list of docs
def query_scs_helper(scs, _dictionary, s):
    processed_query = bow(_dictionary, s)
    print(processed_query)
    sims = scs[processed_query]
    print(sims)
    return sims


def get_gridfs(fs_db, oid):
    db = connect()
    fs = gridfs.GridFS(db, fs_db)
    out = fs.get(oid)
    data = pickle.loads(out.read())
    return data


def put_gridfs(m, fs_db, query_gfs, ext):
    db = connect()
    filename = f"{fs_db}/{query_gfs}.{ext}"
    fs = gridfs.GridFS(db, fs_db)
    f = pickle.dumps(m)
    uid = fs.put(f, filename=filename)
    return uid


def safeget(mp, *keys):
    for key in keys:
        try:
            mp = mp[key]
        except KeyError:
            return None
    return mp


# def update_embedding(q_vector, feedback_vector, feedback):
#     SENSITIVITY = 0.75
#     new_q = (1 - feedback * SENSITIVITY) * q_vector + feedback * SENSITIVITY * feedback_vector
#     return new_q

'''
moveVector:
    q_vector: query vector
    feedback_vector: feedback vector
    feedback: feedback value - 1 for like, -1 for dislike

    returns: new query vector
    side effects: moves the query vector towards the feedback vector by a certain amount defined by sensitivity and then norms the vector to have unit length
'''
# TODO: is this commutative? i.e. can we go from x -> y and then y -> x by the same reverse action?
# TODO: 
def moveVector(sourceVector, destinationVector, direction, magnitude = None):
    magnitude = magnitude if magnitude is not None else 0.75
    new_q = sourceVector + direction*magnitude*(destinationVector - sourceVector)
    new_q = new_q / np.linalg.norm(new_q)
    return new_q

def getPostVector(db, post_id):
    post = db.clean.posts.v3.find_one({"id": post_id}, projection={'selftextVector':1}) # get post which was liked/disliked
    postVector = np.array(post['selftextVector']) # extract vector of post which was liked/disliked
    return postVector

def loadModel():
    model = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")
    return model

def getAllPosts(db, projection, batching=True, batchSize=10000):
    if not batching:
        allPosts = db.clean.posts.v3.find({}, projection=projection)
        allPosts = list(allPosts)
        return allPosts
    
    # fetch all posts from mongodb in batches
    numSkip = 0 
    dataProcessed = 0
    allPosts = []
    while True:
        batch = db.clean.posts.v3.find(projection=projection).skip(numSkip).limit(batchSize)
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
