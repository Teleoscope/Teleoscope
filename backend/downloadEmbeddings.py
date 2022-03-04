import logging
import pickle as pkl
import utils
import numpy as np
import json

db = utils.connect()
allPosts = utils.getAllPosts(db, projection={'id':1, 'selftextVector':1, '_id':0}, batching=True, batchSize=10000)
np.savez('/home/phb/embeddings/embeddings.npz', posts=allPosts)
# with open('embeddings.pkl', 'wb') as handle:
#     pkl.dump(allPosts, handle, protocol=pkl.HIGHEST_PROTOCOL)
print('Completed')
