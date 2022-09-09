import pickle, tqdm, time, os, numpy as np, pandas as pd
from pymongo import MongoClient
from pprint import pprint 
import matplotlib.pyplot as plt
import utils
import umap
import hdbscan
import matplotlib.pyplot as plt
from sklearn.feature_extraction.text import CountVectorizer

from sentence_transformers import SentenceTransformer
from bertopic import BERTopic
from sklearn.feature_extraction.text import CountVectorizer

pd.set_option('max_colwidth', 100)

db = utils.connect()
posts_collection = db.clean.posts.v3
count_docs = posts_collection.count_documents({})
posts = []
for post in tqdm.tqdm_notebook(posts_collection.find(projection={'title': 1, 'id': 1, 'selftext':1, 'selftextVector': 1}), total=count_docs):
    posts.append(post)

df = pd.DataFrame(posts)
df.head()

subset = df[:10000]
subset2 = df[50000:60000]

emb = subset["selftextVector"].to_list()
emb2 = subset2["selftextVector"].to_list()

umap_embeddings = umap.UMAP(n_neighbors=15, 
                            n_components=5, 
                            metric='cosine').fit_transform(emb)

cluster = hdbscan.HDBSCAN(min_cluster_size=5,
                          metric='euclidean',                      
                          cluster_selection_method='eom').fit(umap_embeddings)
# Reduce to 2 dimensions
umap_data = umap.UMAP(n_neighbors=15, n_components=2, min_dist=0.0, metric='cosine').fit_transform(emb)
result = pd.DataFrame(umap_data, columns=['x', 'y'])
result['labels'] = cluster.labels_


# Visualize clusters
fig, ax = plt.subplots(figsize=(20, 10))
outliers = result.loc[result.labels == -1, :]
clustered = result.loc[result.labels != -1, :]
plt.xlim([2, 13])
plt.ylim([-2, 8])
plt.scatter(outliers.x, outliers.y, color='#BDBDBD', s=0.5)
plt.scatter(clustered.x, clustered.y, c=clustered.labels, s=0.5, cmap='hsv_r')
plt.colorbar()

