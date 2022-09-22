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
for post in tqdm.tqdm(
    posts_collection.find(
        projection={'title': 1, 'id': 1, 'selftext':1, 'selftextVector': 1}
    ).limit(60000), total=count_docs):
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
fig.savefig('clusters.png', dpi=fig.dpi)

# Count word frequency per topic
docs_df = pd.DataFrame(subset, columns=["selftext"])
docs_df['Topic'] = cluster.labels_
docs_df['Doc_ID'] = range(len(docs_df))
docs_per_topic = docs_df.groupby(['Topic'], as_index = False).agg({'selftext': ' '.join})

def c_tf_idf(documents, m, ngram_range=(1, 1)):
    count = CountVectorizer(ngram_range=ngram_range, stop_words="english").fit(documents)
    t = count.transform(documents).toarray()
    w = t.sum(axis=1)
    tf = np.divide(t.T, w)
    sum_t = t.sum(axis=0)
    idf = np.log(np.divide(m, sum_t)).reshape(-1, 1)
    tf_idf = np.multiply(tf, idf)

    return tf_idf, count
  
tf_idf, count = c_tf_idf(docs_per_topic.selftext.values, m=len(subset))

def extract_top_n_words_per_topic(tf_idf, count, docs_per_topic, n=20):
    words = count.get_feature_names()
    labels = list(docs_per_topic.Topic)
    tf_idf_transposed = tf_idf.T
    indices = tf_idf_transposed.argsort()[:, -n:]
    top_n_words = {label: [(words[j], tf_idf_transposed[i][j]) for j in indices[i]][::-1] for i, label in enumerate(labels)}
    return top_n_words

def extract_topic_sizes(df):
    topic_sizes = (df.groupby(['Topic'])
                     .selftext
                     .count()
                     .reset_index()
                     .rename({"Topic": "Topic", "selftext": "Size"}, axis='columns')
                     .sort_values("Size", ascending=False))
    return topic_sizes

top_n_words = extract_top_n_words_per_topic(tf_idf, count, docs_per_topic, n=20)
topic_sizes = extract_topic_sizes(docs_df)

topic_sizes.sort_values('Size', ascending=False, inplace=True)
top_sizes = topic_sizes[1:]
plt.bar(top_sizes['Topic'], top_sizes['Size'])
plt.title('Size of Topics for Sample 1')

fig.savefig('topics.png', dpi=fig.dpi)
