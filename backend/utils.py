# builtin modules
import pickle

# installed modules
from pymongo import MongoClient
import gridfs
from tqdm import tqdm

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
    client = MongoClient(connect_str)
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


def update_embedding(q_vector, feedback_vector, feedback):
    SENSITIVITY = 0.75
    new_q = (1 - feedback * SENSITIVITY) * q_vector + feedback * SENSITIVITY * feedback_vector
    return new_q
