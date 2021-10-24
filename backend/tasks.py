from utils import *
import numbers
from collections.abc import Iterable
import sys
import os
import io
import importlib
import gridfs
import time
from tqdm import tqdm
import scipy.sparse
import requests
from celery import Celery
from pymongo import MongoClient
import auth
from sklearn.feature_extraction.text import TfidfTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from numpy import asarray
from numpy import savez_compressed
import bottleneck as bn
import random
import pickle
# from compress_pickle import dump, load
from itertools import chain
from joblib import dump, load
# from sklearn.externals import joblib
# import warnings filter
from warnings import simplefilter
import logging
from bson.objectid import ObjectId


import gensim.downloader as api
from gensim.corpora import Dictionary
from gensim import models
from gensim.models import TfidfModel
from gensim.similarities import WordEmbeddingSimilarityIndex
from gensim.similarities import SparseTermSimilarityMatrix
from gensim.similarities import SoftCosineSimilarity
from gensim.similarities import Similarity
from gensim.utils import simple_preprocess
from gensim.test.utils import datapath, get_tmpfile
from gensim.models import Word2Vec
from gensim.models.doc2vec import Doc2Vec, TaggedDocument

# Thanks to http://brandonrose.org/clustering!
# and https://towardsdatascience.com/how-to-rank-text-content-by-semantic-similarity-4d2419a84c32

# ignore all future warnings
simplefilter(action='ignore', category=FutureWarning)

# url: "amqp://myuser:mypassword@localhost:5672/myvhost"
celery_broker_url = (
    f'pyamqp://'
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


''' Keyword groups
    {
        "label": "password",
        "include_words": ["password", "account", "key"],
        "exclude_words": ["pass", "word"],
    }
'''

''' Document groups
    {
        "label": ""
    }

'''





@app.task
def push(query_string, field, values):
    op = {"$addToSet": {field: {"$each": values}}}
    db = connect()
    results = db.queries.update(query_string, op)
    return results


@app.task
def query_scs_by_ids(*args, query_string, ids_string):
    print(ids_string)
    db = connect()
    query_results = db.queries.find_one(query(query_string))

    if not query_results:
        run_query_init(query_string)
        query_results = db.queries.find_one(query(query_string))

    scs_oid = query_results["scs_oid"]
    dict_oid = query_results["dict_oid"]
    reddit_ids = query_results["reddit_ids"]

    _scs = get_gridfs("softCosineSimilarityIndices", scs_oid)
    _dict = get_gridfs("dictionaries", dict_oid)

    ids = ids_string.split(" ")
    mdb_query = {"id": {"$in": ids}}
    cursor = db.posts.find(mdb_query)
    results = list(cursor)

    if len(results) == 0:
        return ({}, [])

    _ppcorpus = preprocess(results)
    _bow = corpus(_ppcorpus, _dict)
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

    return (result, ranked_post_ids)



@app.task
def query_scs(*args, query_string, doc_string):
    db = connect()

    p = {"scs_oid": True, "reddit_ids": True, "dict_oid": True}
    mdb_query = query(query_string)
    results = db.queries.find_one(mdb_query)

    scs_oid = results["scs_oid"]
    dict_oid = results["dict_oid"]
    reddit_ids = results["reddit_ids"]

    _scs = get_gridfs("softCosineSimilarityIndices", scs_oid)
    _dict = get_gridfs("dictionaries", dict_oid)

    # sims format: [(int, float), ...]
    sims = query_scs_helper(_scs, _dict, doc_string)
    ranked_post_ids = [(reddit_ids[i], f) for (i, f) in sims]

    mdb_upload = {
        "ranked_post_ids": ranked_post_ids
    }

    result = db.queries.update_one(
        {"query": query_string},
        {"$set": mdb_upload},
        upsert=True
    )

    return (result, ranked_post_ids)


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


def put_gridfs(m, fs_db, query, ext):
    db = connect()
    filename = f"{fs_db}/{query}.{ext}"
    fs = gridfs.GridFS(db, fs_db)
    f = pickle.dumps(m)
    uid = fs.put(f, filename=filename)
    return uid


@app.task
def run_query_init(query_string):
    db = connect()

    check = db.queries.find_one(query(query_string))
    if check:
        return (check, check["reddit_ids"])
    else:
        # insert a mostly blank doc to reserve the query
        #  string for a single processing task
        db.queries.insert_one({"query": query_string})


    _query = query(query_string)        # properly formatted query string
    _find = find(_query)                # raw results from mongodb as a list
    _ppcorpus = preprocess(_find)       # preprocessed text
    _reddit_ids = redditids(_find)      # ordered list of reddit ids in
                                        # query used to index corpus
                                        # back to original posts

    _dict = dictionary(_ppcorpus)        # gensim Dictionary
    _corpus = corpus(_ppcorpus, _dict)   # bow corpus
    _m = load("glove-wiki-gigaword-50")  # load text model
    _tsm = sparseTSM(_m, _dict)          # create term similarity matrix
    _scs = softCosSim(_corpus, _tsm)     # create soft cosine similarity index

    mdb_upload = {
        "query": query_string,
        "reddit_ids": _reddit_ids,
        "ppcorpus": put_gridfs(
            _ppcorpus,
            "pp_corpora",
            query_string,
            "pp_corpus"),
        "corpus": put_gridfs(
            _corpus,
            "corpora",
            query_string,
            "corpus"),
        "dict_oid": put_gridfs(
            _dict,
            "dictionaries",
            query_string,
            "dict"),
        "tsm_oid": put_gridfs(
            _tsm,
            "sparseTermSimilarityMatrices",
            query_string,
            "tsm"),
        "scs_oid": put_gridfs(
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
    return (result, _reddit_ids)
