# builtin modules
import logging
import pickle
from warnings import simplefilter
import utils

# installed modules
import gridfs
from gridfs import GridFS
import json

import numpy as np
import tensorflow_hub as hub
from celery import Celery, Task

# local files
import auth

# Thanks to http://brandonrose.org/clustering!
# and https://towardsdatascience.com/how-to-rank-text-content-by-semantic-similarity-4d2419a84c32

# ignore all future warnings
simplefilter(action='ignore', category=FutureWarning)

# url: "amqp://myuser:mypassword@localhost:5672/myvhost"
celery_broker_url = (
    f'amqp://'
    f'{auth.rabbitmq["username"]}:'
    f'{auth.rabbitmq["password"]}@'
    f'{auth.rabbitmq["host"]}/'
    f'{auth.rabbitmq["vhost"]}'
)
app = Celery('tasks', backend='rpc://', broker=celery_broker_url)
app.conf.update(
    task_serializer='pickle',
    accept_content=['pickle'],  # Ignore other content
    result_serializer='pickle',
)

@app.task
def push(query_string, field, values):
    op = {"$addToSet": {field: {"$each": values}}}
    db = utils.connect()
    results = db.queries.update(query_string, op)
    return results


@app.task
def query_scs_by_ids(query_string, ids_string):
    logging.info(f"Parameter ids_string: {ids_string}")
    db = utils.connect()
    query_results = db.queries.find_one(utils.query(query_string))

    if not query_results:
        run_query_init(query_string)
        query_results = db.queries.find_one(utils.query(query_string))

    scs_oid = query_results["scs_oid"]
    dict_oid = query_results["dict_oid"]
    reddit_ids = query_results["reddit_ids"]

    _scs = utils.get_gridfs("softCosineSimilarityIndices", scs_oid)
    _dict = utils.get_gridfs("dictionaries", dict_oid)

    ids = ids_string.split(" ")
    mdb_query = {"id": {"$in": ids}}
    cursor = db.posts.find(mdb_query)
    results = list(cursor)

    if len(results) == 0:
        return {}, []

    _ppcorpus = utils.preprocess(results)
    _bow = utils.corpus(_ppcorpus, _dict)
    _sims = _scs[_bow]

    ranked_post_ids = [(reddit_ids[i], f) for (i, f) in _sims[0]]

    mdb_upload = {
        "ranked_post_ids": ranked_post_ids
    }

    result = db.queries.update_one(
        {"query": query_string},
        {"$set": mdb_upload},
        upsert=True
    )

    return result, ranked_post_ids


@app.task
def query_scs(query_string="none", doc_string="none"):
    db = utils.connect()

    mdb_query = utils.query(query_string)
    results = db.queries.find_one(mdb_query)

    scs_oid = results["scs_oid"]
    dict_oid = results["dict_oid"]
    reddit_ids = results["reddit_ids"]

    _scs = utils.get_gridfs("softCosineSimilarityIndices", scs_oid)
    _dict = utils.get_gridfs("dictionaries", dict_oid)

    # sims format: [(int, float), ...]
    sims = utils.query_scs_helper(_scs, _dict, doc_string)
    ranked_post_ids = [(reddit_ids[i], f) for (i, f) in sims]

    mdb_upload = {
        "ranked_post_ids": ranked_post_ids
    }

    result = db.queries.update_one(
        {"query": query_string},
        {"$set": mdb_upload},
        upsert=True
    )

    return result, ranked_post_ids


# _dictionary, str -> list of docs
def query_scs_helper(scs, _dictionary, s):
    processed_query = utils.bow(_dictionary, s)
    logging.info(f"processed query: {processed_query}")
    sims = scs[processed_query]
    logging.info(f"sims: {sims}")
    return sims


def get_gridfs(fs_db, oid):
    db = utils.connect()
    fs = gridfs.GridFS(db, fs_db)
    out = fs.get(oid)
    data = pickle.loads(out.read())
    return data


def put_gridfs(m, fs_db, query, ext):
    db = utils.connect()
    filename = f"{fs_db}/{query}.{ext}"
    fs = gridfs.GridFS(db, fs_db)
    f = pickle.dumps(m)
    uid = fs.put(f, filename=filename)
    return uid


@app.task
def run_query_init(query_string):
    db = utils.connect()

    check = db.queries.find_one(utils.query(query_string))
    if check:
        return check, check["reddit_ids"]
    else:
        # insert a mostly blank doc to reserve the query
        #  string for a single processing task
        db.queries.insert_one({"query": query_string})

    _query = utils.query(query_string)  # properly formatted query string
    _find = utils.find(_query)  # raw results from mongodb as a list
    _ppcorpus = utils.preprocess(_find)  # preprocessed text
    _reddit_ids = utils.redditids(_find)  # ordered list of reddit ids in
    # query used to index corpus
    # back to original posts

    _dict = utils.dictionary(_ppcorpus)  # gensim Dictionary
    _corpus = utils.corpus(_ppcorpus, _dict)  # bow corpus
    _m = utils.load("glove-wiki-gigaword-50")  # load text model
    _tsm = utils.sparse_tsm(_m, _dict)  # create term similarity matrix
    _scs = utils.soft_cos_sim(_corpus, _tsm)  # create soft cosine similarity index

    mdb_upload = {
        "query": query_string,
        "reddit_ids": _reddit_ids,
        "ppcorpus": utils.put_gridfs(
            _ppcorpus,
            "pp_corpora",
            query_string,
            "pp_corpus"),
        "corpus": utils.put_gridfs(
            _corpus,
            "corpora",
            query_string,
            "corpus"),
        "dict_oid": utils.put_gridfs(
            _dict,
            "dictionaries",
            query_string,
            "dict"),
        "tsm_oid": utils.put_gridfs(
            _tsm,
            "sparseTermSimilarityMatrices",
            query_string,
            "tsm"),
        "scs_oid": utils.put_gridfs(
            _scs,
            "softCosineSimilarityIndices",
            query_string,
            "scs")
    }

    result = db.queries.update_one(
        {"query": query_string},
        {"$set": mdb_upload},
        upsert=True
    )
    return result, _reddit_ids



'''
TODO:
1. As we move towards/away from docs, we need to keep track of which docs have been moved towards/away from
   because those docs should not be show in the ranked documents.
'''
class reorient(Task):
    
    def __init__(self):
        self.allPosts = None
        self.db = None
        self.model = None
        

    def run(self, teleoscope_id: str, positive_docs: list, negative_docs: list, query: str):
        if self.allPosts is None:
            logging.info('Embeddings not cached...')
            with open('/home/phb/embeddings/embeddings.pkl', 'rb') as handle:
                self.allPosts = pickle.load(handle)
            logging.info('Embeddings cached...')
        else:
            logging.info('Embeddings already cached...')

        if self.db is None:
            logging.info('DB connection not cached, connecting to DB...')
            self.db = utils.connect()
            logging.info('DB connection cached...')
        else:
            logging.info('DB connection already cached...')
        
        queryDocument = self.db.queries.find_one({"query": query, "teleoscope_id": teleoscope_id})
        # check if stateVector exists
        if 'stateVector' in queryDocument:
            stateVector = np.array(queryDocument['stateVector'])
        else:
            if self.model is None:
                logging.info('Model not cached, loading model...')
                self.model = utils.loadModel()
                logging.info('Model cached...')
            else:
                logging.info('Model already cached...')

            stateVector = self.model([query]).numpy() # convert query string to vector

        # get vectors for positive and negative doc ids using utils.getPostVector function
        # TODO: OPTIMIZE
        posVecs = []
        for pos_id in positive_docs:
            v = utils.getPostVector(self.db, pos_id)
            posVecs.append(v)

        negVecs = []
        for neg_id in negative_docs:
            v = utils.getPostVector(self.db, neg_id)*-1 # need -1??
            negVecs.append(v)
        
        avgPosVec = None
        avgNegVec = None

        # handle different cases of number of docs in each list
        if len(posVecs) >= 1:
            avgPosVec = np.array(posVecs).mean(axis=0)
        if len(negVecs) >= 1:
            avgNegVec = np.array(negVecs).mean(axis=0)

        if avgPosVec is not None and avgNegVec is not None:
            resultantVec = avgPosVec - avgNegVec
        elif avgPosVec is None and avgNegVec is not None:
            resultantVec = avgNegVec
        elif avgPosVec is not None and avgNegVec is None:
            resultantVec = avgPosVec

        # make unit vector
        resultantVec = resultantVec / np.linalg.norm(resultantVec)
        qprime = utils.moveVector(sourceVector=stateVector, destinationVector=resultantVec, direction=1) # move qvector towards/away from feedbackVector

        scores = utils.calculateSimilarity(self.allPosts, qprime)
        newRanks = utils.rankPostsBySimilarity(self.allPosts, scores)

        # convert to json to upload to gridfs
        dumps = json.dumps(newRanks)
        # upload to gridfs
        fs = GridFS(self.db, "queries")
        obj = fs.put(dumps, encoding='utf-8')

        # update stateVector
        self.db.queries.update_one({"query": query, "teleoscope_id": teleoscope_id}, {'$set': { "stateVector" : qprime.tolist()}})
        # update rankedPosts
        self.db.queries.update_one({"query": query, "teleoscope_id": teleoscope_id}, {'$set': { "ranked_post_ids" : obj}})

        return 200

robj = app.register_task(reorient())
# add = app.tasks[reorient.name]
# '''
# TODO:
# 1. As we move towards/away from docs, we need to keep track of which docs have been moved towards/away from
#    because those docs should not be show in the ranked documents.
# '''
# @app.task
# def reorient(teleoscope_id: str, positive_docs: list, negative_docs: list, query: str):
#     db = utils.connect()
#     queryDocument = db.queries.find_one({"query": query, "teleoscope_id": teleoscope_id})
#     # check if stateVector exists
#     if 'stateVector' in queryDocument:
#         stateVector = np.array(queryDocument['stateVector'])
#     else:
#         logging.info('loading model')
#         model = utils.loadModel() # load NLP model
#         stateVector = model([query]).numpy() # convert query string to vector

#     # get vectors for positive and negative doc ids using utils.getPostVector function
#     posVecs = []
#     for pos_id in positive_docs:
#         v = utils.getPostVector(db, pos_id)
#         posVecs.append(v)

#     negVecs = []
#     for neg_id in negative_docs:
#         v = utils.getPostVector(db, neg_id)*-1 # need -1??
#         negVecs.append(v)
    
#     avgPosVec = None
#     avgNegVec = None

#     # handle different cases of number of docs in each list
#     if len(posVecs) >= 1:
#         avgPosVec = np.array(posVecs).mean(axis=0)
#     if len(negVecs) >= 1:
#         avgNegVec = np.array(negVecs).mean(axis=0)

#     if avgPosVec is not None and avgNegVec is not None:
#         resultantVec = avgPosVec - avgNegVec
#     elif avgPosVec is None and avgNegVec is not None:
#         resultantVec = avgNegVec
#     elif avgPosVec is not None and avgNegVec is None:
#         resultantVec = avgPosVec

#     # make unit vector
#     resultantVec = resultantVec / np.linalg.norm(resultantVec)
#     qprime = utils.moveVector(sourceVector=stateVector, destinationVector=resultantVec, direction=1) # move qvector towards/away from feedbackVector
#     # allPosts = utils.getAllPosts(db, projection={'id':1, 'selftextVector':1}, batching=True, batchSize=10000)
#     logging.info("reading emebddings data...")
#     with open('/home/phb/embeddings/embeddings.pkl', 'rb') as handle:
#         allPosts = pickle.load(handle)
#     logging.info("loaded emebddings data...")

#     scores = utils.calculateSimilarity(allPosts, qprime)
#     newRanks = utils.rankPostsBySimilarity(allPosts, scores)

#     # convert to json to upload to gridfs
#     dumps = json.dumps(newRanks)
#     # upload to gridfs
#     fs = GridFS(db, "queries")
#     obj = fs.put(dumps, encoding='utf-8')

#     # update stateVector
#     db.queries.update_one({"query": query, "teleoscope_id": teleoscope_id}, {'$set': { "stateVector" : qprime.tolist()}})
#     # update rankedPosts
#     db.queries.update_one({"query": query, "teleoscope_id": teleoscope_id}, {'$set': { "ranked_post_ids" : obj}})

#     return 200
