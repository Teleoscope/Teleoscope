import tqdm, numpy as np
import matplotlib.pyplot as plt
import utils
import umap
import hdbscan
import matplotlib.pyplot as plt
import logging
from bson.objectid import ObjectId
import gc
import tasks
from sklearn.preprocessing import StandardScaler
import numba
from scipy.spatial import distance

from sklearn.metrics.pairwise import cosine_similarity

# connect to database
db = utils.connect()

# hardcoded group id strings
group_id_strings = ['63901a89e189962b660959cf', '63901a92931eeac91c9924a1', '63901a96e189962b660959d3']

# convert to objectId's
group_ids = [ObjectId(str(id)) for id in group_id_strings]

# retrieve groups from database
groups = list(db.groups.find({"_id":{"$in" : group_ids}}))
print("Retrieved " + str(len(groups)) + " groups from database")

teleoscope_oid = groups[0]["teleoscope"]
teleoscope = db.teleoscopes.find_one({"_id": ObjectId(str(teleoscope_oid))})
projection = {'id': 1, 'textVector': 1}


all_ordered_documents = utils.gridfsDownload(db, "teleoscopes", ObjectId(str(teleoscope["history"][0]["ranked_document_ids"])))
# grab only subset of the ordered documents

limit = 10000
ordered_documents = all_ordered_documents[0:limit]
limit = min(limit, len(ordered_documents))

# cursor is a generator which means it yields a new doc one at a time
cursor = db.documents.find(
    # query
    {"id":{"$in": [document[0] for document in ordered_documents]}},
    projection=projection,
    # batch size means number of documents at a time taken from MDB, no impact on iteration
    batch_size=500
)

document_ids = []
document_vectors = []

# for large datasets, this will take a while. Would be better to find out whether the UMAP fns can 
# accept generators for lazy calculation
for document in tqdm.tqdm(cursor, total=limit):
    document_ids.append(document["id"])
    document_vectors.append(document["textVector"])

print("There are " + str(len(document_ids)) + " document ids.")
print("There are " + str(len(document_vectors)) + " document vectors.")

np.savez_compressed('teleo_order_docs', doc_ids=document_ids, doc_vecs=document_vectors)

loaded = np.load('teleo_order_docs.npz')
document_ids = loaded['doc_ids'].tolist()
document_vectors = loaded['doc_vecs']

data = document_vectors

for group in groups:

    # grab latest history item for each group
    group_document_ids = group["history"][0]["included_documents"]
    
    indices = []
    
    for id in group_document_ids:
        
        try:
            index = document_ids.index(id)
            indices.append(index)
        
        except:
            document = db.documents.find_one({"id": id}, projection=projection)
            document_ids.append(id)
            vector = np.array(document["textVector"]).reshape((1, 512))
            data = np.append(data, vector, axis=0)
            
            index = document_ids.index(id)
            indices.append(index)
            
    print("Document ids has the shape: ", len(document_ids))
    print("The data has shape: ", data.shape)

size = len(document_vectors)
dist_mat = np.zeros((size,size))

print("Building Distance Matrix of Size: ", size)

for diag in range(size):
    for i in range(size-diag):  
        
        j = i + diag
        
        if j != i:
            
            vec_i = document_vectors[i]
            vec_j = document_vectors[j]
            dist = cosine_similarity([vec_i],[vec_j])[0][0]
            dist_mat[i,j] = dist
            dist_mat[j,i] = dist

print("Done")

np.savez_compressed('distance_matrix', mat=dist_mat)