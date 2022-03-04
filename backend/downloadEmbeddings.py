import logging
import pickle as pkl
import utils
import numpy as np

db = utils.connect()
allPosts = utils.getAllPosts(db, projection={'id':1, 'selftextVector':1, '_id':0}, batching=True, batchSize=10000)
with open('embeddings.pkl', 'wb') as handle:
    pkl.dump(allPosts, handle, protocol=pkl.HIGHEST_PROTOCOL)