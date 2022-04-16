
import logging, pickle, utils, json, numpy as np, tensorflow_hub as hub
from gridfs import GridFS
from celery import Task

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

    def cachePostsData(self, path='/home/phb/embeddings/'):
        # cache embeddings
        self.allPostVectors = np.load(path + 'embeddings.npz', allow_pickle=False)['posts']
        # cache posts ids
        with open(path + '/ids.pkl', 'rb') as handle:
                self.allPostIDs = pickle.load(handle)

        self.postsCached = True

        return

    def moveVector(self, sourceVector, destinationVector, direction, magnitude = None):
        magnitude = magnitude if magnitude is not None else 0.75
        new_q = sourceVector + direction*magnitude*(destinationVector - sourceVector)
        new_q = new_q / np.linalg.norm(new_q)
        return new_q

    def getPostVector(self, db, post_id):
        post = db.clean.posts.v2.find_one({"id": post_id}, projection={'selftextVector':1}) # get post which was liked/disliked
        postVector = np.array(post['selftextVector']) # extract vector of post which was liked/disliked
        return postVector

    def loadModel(self):
        model = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")
        return model

    def calculateSimilarity(self, postVectors, queryVector):
        scores = queryVector.dot(postVectors.T).flatten() # cosine similarity scores. (assumes vectors are normalized to unit length)
        return scores

    # create and return a list a tuples of (post_id, similarity_score) sorted by similarity score, high to low
    def rankPostsBySimilarity(self, posts_ids, scores):
        return sorted([(post_id, score) for (post_id, score) in zip(posts_ids, scores)], key=lambda x:x[1], reverse=True)
    '''
    Computes the resultant vector for positive and negative docs.
    Resultant vector is the final vector that the stateVector of the teleoscope should move towards/away from.
    '''
    def computeResultantVector(self, positive_docs, negative_docs):
        # get vectors for positive and negative doc ids using utils.getPostVector function
        # TODO: OPTIMIZE
        
        posVecs = [] # vectors we want to move towards
        for pos_id in positive_docs:
            v = self.getPostVector(self.db, pos_id)
            posVecs.append(v)

        negVecs = [] # vectors we want to move away from
        for neg_id in negative_docs:
            v = self.getPostVector(self.db, neg_id)
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
        # either positive or negative docs should have at least one entry
        if len(positive_docs) == 0 and len(negative_docs) == 0:
            # if both are empty, then cache stuff if not cached alreadt
            # Check if post ids and vectors are cached
            if self.postsCached == False:
                self.cachePostsData()

            # Check if db connection is cached
            if self.db is None:
                self.db = utils.connect()

            # do nothing since no feedback given on docs
            return

        # Check if post ids and vectors are cached
        if self.postsCached == False:
            self.cachePostsData()

        # Check if db connection is cached
        if self.db is None:
            self.db = utils.connect()

        # get query document from queries collection
        queryDocument = self.db.queries.find_one({"query": query, "teleoscope_id": teleoscope_id})

        if queryDocument == None:
           querySearch(query, teleoscope_id)
           queryDocument = self.db.queries.find_one({"query": query, "teleoscope_id": teleoscope_id})
           logging.info("queryDocument is being generated.")

        # check if stateVector exists
        stateVector = None
        if 'stateVector' in queryDocument:
            stateVector = np.array(queryDocument['stateVector'])
        elif self.model is None:
            self.model = self.loadModel()
            stateVector = self.model([query]).numpy() # convert query string to vector
        else:
            stateVector = self.model([query]).numpy() # convert query string to vector

        resultantVec, direction = self.computeResultantVector(positive_docs, negative_docs)
        qprime = self.moveVector(sourceVector=stateVector, destinationVector=resultantVec, direction=direction) # move qvector towards/away from feedbackVector
        scores = self.calculateSimilarity(self.allPostVectors, qprime)
        newRanks = self.rankPostsBySimilarity(self.allPostIDs, scores)
        gridfsObj = self.gridfsUpload("queries", newRanks)

        rank_slice = newRanks[0:500]

        # update stateVector
        self.db.queries.update_one({"query": query, "teleoscope_id": teleoscope_id}, {'$set': { "stateVector" : qprime.tolist()}})
        # update rankedPosts
        self.db.queries.update_one({"query": query, "teleoscope_id": teleoscope_id}, {'$set': { "ranked_post_ids" : gridfsObj}})
        # update a slice of rank_slice
        self.db.queries.update_one({"query": query, "teleoscope_id": teleoscope_id}, {'$set': { "rank_slice" : rank_slice}})

        return 200 # TODO: what to return?