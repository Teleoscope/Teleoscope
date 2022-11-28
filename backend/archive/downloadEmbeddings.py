import pickle as pkl
import utils
import numpy as np

db = utils.connect()
allDocuments = utils.getAllDocuments(db, projection={'id':1, 'textVector':1, '_id':0}, batching=True, batchSize=10000)
ids = [x['id'] for x in allDocuments]
vecs = np.array([x['textVector'] for x in allDocuments])

np.savez('~/embeddings/embeddings.npz', documents=vecs)

with open('~/embeddings/ids.pkl', 'wb') as handle:
    pkl.dump(ids, handle, protocol=pkl.HIGHEST_PROTOCOL)

print('Completed')
