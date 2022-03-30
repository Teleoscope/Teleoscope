import logging, pickle, utils, json, auth, numpy as np, tensorflow_hub as hub
from warnings import simplefilter
from gridfs import GridFS
from celery import Celery, Task

# ignore all future warnings
simplefilter(action='ignore', category=FutureWarning)

# url: "amqp://myuser:mypassword@localhost:5672/myvhost"
CELERY_BROKER_URL = (
    f'amqp://'
    f'{auth.rabbitmq["username"]}:'
    f'{auth.rabbitmq["password"]}@'
    f'{auth.rabbitmq["host"]}/'
    f'{auth.rabbitmq["vhost"]}'
)

app = Celery('tasks', backend='rpc://', broker=CELERY_BROKER_URL)
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
    db.queries.update_one({'query': query_string, 'teleoscope_id': teleoscope_id}, {'$set': {'reddit_ids': return_ids}})
    
    logging.info(f"query {query_string} added to queries collection")
    return return_ids


@app.task
def reorient_caller(teleoscope_id: str, positive_docs: list, negative_docs: list, query: str):
    Reorient().run(teleoscope_id, positive_docs, negative_docs, query)


'''
TODO:
1. As we move towards/away from docs, we need to keep track of which docs have been moved towards/away from
   because those docs should not be show in the ranked documents.
'''

class Reorient(Task):
    def __init__(self):
        self.postsCached = False
        self.allPostIDs = None
        self.allPostVectors = None
        self.db = None
        self.model = None
        self.name = "Reorient"    

    def cachePostsData(self, path='/home/phb/embeddings/'):
        # cache embeddings
        self.allPostVectors = np.load(path + 'embeddings.npz', allow_pickle=False)['posts']
        # cache posts ids
        with open(path + '/ids.pkl', 'rb') as handle:
                self.allPostIDs = pickle.load(handle)

        self.postsCached = True

        return
    '''
    Computes the resultant vector for positive and negative docs.
    Resultant vector is the final vector that the stateVector of the teleoscope should move towards/away from.
    '''
    def computeResultantVector(self, positive_docs, negative_docs):
        # get vectors for positive and negative doc ids using utils.getPostVector function
        # TODO: OPTIMIZE
        
        posVecs = [] # vectors we want to move towards
        for pos_id in positive_docs:
            v = utils.getPostVector(self.db, pos_id)
            posVecs.append(v)

        negVecs = [] # vectors we want to move away from
        for neg_id in negative_docs:
            v = utils.getPostVector(self.db, neg_id)
            negVecs.append(v)
        
        avgPosVec = None # avg positive vector
        avgNegVec = None # avg negative vector
        direction = 1 # direction of movement

        # handle different cases of number of docs in each list
        if len(posVecs) >= 1:
            avgPosVec = np.array(posVecs).mean(axis=0)
        if len(negVecs) >= 1:
            avgNegVec = np.array(negVecs).mean(axis=0)

        # if both lists are not empty
        if avgPosVec is not None and avgNegVec is not None:
            resultantVec = avgPosVec - avgNegVec
        # if only negative list has entries
        elif avgPosVec is None and avgNegVec is not None:
            resultantVec = avgNegVec
            # change direction of movement since we want to move away in this case
            direction = -1
        # if only positive list has entries
        elif avgPosVec is not None and avgNegVec is None:
            resultantVec = avgPosVec
        
        resultantVec /= np.linalg.norm(resultantVec)
        return resultantVec, direction

    def gridfsUpload(self, namespace, data, encoding='utf-8'):
         # convert to json
        dumps = json.dumps(data)
        fs = GridFS(self.db, namespace)
        obj = fs.put(dumps, encoding=encoding)
        return obj

    def run(self, teleoscope_id: str, positive_docs: list, negative_docs: list, query: str):
        # Check if post ids and vectors are cached
        if self.postsCached == False:
            self.cachePostsData()

        # Check if db connection is cached
        if self.db is None:
            self.db = utils.connect()

        # get query document from queries collection
        queryDocument = self.db.queries.find_one({"query": query, "teleoscope_id": teleoscope_id})

        # check if stateVector exists
        stateVector = None
        if 'stateVector' in queryDocument:
            stateVector = np.array(queryDocument['stateVector'])
        elif self.model is None:
            self.model = utils.loadModel()
            stateVector = self.model([query]).numpy() # convert query string to vector
        else:
            stateVector = self.model([query]).numpy() # convert query string to vector

        resultantVec, direction = self.computeResultantVector(positive_docs, negative_docs)
        qprime = utils.moveVector(sourceVector=stateVector, destinationVector=resultantVec, direction=direction) # move qvector towards/away from feedbackVector
        scores = utils.calculateSimilarity(self.allPostVectors, qprime)
        newRanks = utils.rankPostsBySimilarity(self.allPostIDs, scores)
        gridfsObj = self.gridfsUpload("queries", newRanks)

        # update stateVector
        self.db.queries.update_one({"query": query, "teleoscope_id": teleoscope_id}, {'$set': { "stateVector" : qprime.tolist()}})
        # update rankedPosts
        self.db.queries.update_one({"query": query, "teleoscope_id": teleoscope_id}, {'$set': { "ranked_post_ids" : gridfsObj}})

        return 200 # TODO: what to return?


robj = app.register_task(Reorient())
app.tasks.register(Reorient())
# add = app.tasks[Reorient.name]