# builtin modules
import logging
import pickle
from warnings import simplefilter
import utils

# installed modules
import gridfs
import numpy as np
import tensorflow_hub as hub
from celery import Celery

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

'''
querySearch:
Performs a text query on aita.clean.posts.v2 text index.
If the query string alredy exists in the queries collection, returns existing reddit_ids.
Otherwise, adds the query to the queries collection and performs a text query the results of which are added to the
queries collection and returned.

TODO: 
1. We can use GridFS to store the results of the query if needed (if sizeof(reddit_ids) > 16MB).
   Doesnt seem to be an issue right now.
2. Checks for both teleoscope_id and query. Need confirmation from frontend on whether the teleoscope_id and/or query will already exist?
   If not, then who updates them?
'''
@app.task
def querySearch(query_string, teleoscope_id):
    db = utils.connect()
    query_results = db.queries.find_one({"query": query_string, "teleoscope_id": teleoscope_id})
    
    # check if query already exists
    if query_results is not None:
        logging.info(f"query {query_string} already exists in queries collection")
        return query_results['reddit_ids']

    # create a new query document
    db.queries.insert_one({"query": query_string, "teleoscope_id": teleoscope_id})

    # perform text search query
    textSearchQuery = {"$text": {"$search": query_string}}
    cursor = db.clean.posts.v2.find(textSearchQuery, projection = {'id':1})
    return_ids = [x['id'] for x in cursor]

    # store results in queries collection
    db.queries.update_one({'query': query_string},
                      {'$set': {"reddit_ids": return_ids}})
    
    logging.info(f"query {query_string} added to queries collection")
    return return_ids




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


@app.task
def nlp(query_string: str, post_id: str, status: int):
    db = utils.connect()
    embed = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")  # load NLP model
    qvector = embed([query_string]).numpy()

    rids = db.queries.find_one({"query": query_string}, projection={'reddit_ids': 1})[
        'reddit_ids']  # get reddit ids of posts currently displayed for given query
    feedback_post = db.clean.posts.find_one({"id": post_id},
                                            projection={'vector': 1})  # get vector of post which was liked/disliked
    feedback_vector = np.array(feedback_post['vector'])
    qprime = utils.update_embedding(qvector, feedback_vector, status)  # move qvector towards/away from feedback_vector

    postSubset = []
    # get all posts that are currently displayed
    for p in db.clean.posts.find({'id': {'$in': rids}}, projection={'id': 1, 'vector': 1}):
        postSubset.append(p)

    # get vectors of all posts currently displayed
    vectors = np.array([x['vector'] for x in postSubset])

    scores = qprime.dot(vectors.T).flatten()  # get similarity scores for all those posts

    ret = []  # final list of posts to be displayed, ordered
    for i in range(len(postSubset)):
        id_ = postSubset[i]['id']
        score = scores[i]
        ret.append((id_, score))

    ret.sort(key=lambda x: x[1], reverse=True)  # sort by similarity score, high to low
    db.queries.update_one({'query': query_string},
                          {'$set': {"ranked_post_ids": ret}})  # update query with new ranked post ids

    return 200