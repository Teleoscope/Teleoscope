import tqdm, numpy as np, pandas as pd
import matplotlib.pyplot as plt
import utils
import umap
import hdbscan
import matplotlib.pyplot as plt
from sklearn.feature_extraction.text import CountVectorizer
import logging
from sklearn.feature_extraction.text import CountVectorizer
from bson.objectid import ObjectId
import gc

def cluster_by_groups(group_id_strings):
    """Cluster documents using user-provided group ids

    group_id_strings : list(string) where the strings are MongoDB ObjectID format

    """
    # Create ObjectIds
    group_ids = [ObjectId(str(id)) for id in group_id_strings]

    # connect to the database
    db = utils.connect()

    # start by getting the groups
    groups = list(db.groups.find({"_id":{"$in" : group_ids}}))

    # Count docs to feed to TQDM progress bar, also to test connection to database
    count_docs = db.clean.posts.v3.count_documents({})
    logging.info(f'There are {count_docs} in the collection.')

    # cursor is a generator which means that it yields a new doc one at a time
    cursor = db.clean.posts.v3.find(projection={'id': 1, 'selftextVector': 1}, batch_size=500)

    # only needed for an intermediary variable for making the DataFrame
    # tests on 600k docs shows that the list is a lot smaller (1/5) than the DataFrame, so possibly
    # better to put directly into the numpy array on create, but haven't tested yet
    post_ids = []
    post_vectors = []

    # for large datasets, this will take a while. Would be better to find out whether the UMAP fns 
    # can accept generators for lazy calculation 
    for post in tqdm.tqdm(cursor, total=count_docs):
        post_ids.append(post["id"])
        post_vectors.append(post["selftextVector"])
    
    logging.info("Creating data np.array...")
    data = np.array(post_vectors)
    logging.info(f'Post data np.array has shape {data.shape}')

    post_vectors = []
    gc.collect()

    # initialize labels to array of -1 for each post
    # assuming a sparse labeling scheme
    labels = np.full(data.shape[0], -1)

    label = 1
    # add the correct labels to the label np.array
    for group in groups:
        # grab latest history item for each group
        group_post_ids = group["history"][0]["included_posts"]
        # save label just in case (not pushed to MongoDB, only local)
        group["label"] = label
        # get the index of each post_id so that it's aligned with the label np.array
        indices = [post_ids.index(gpid) for gpid in group_post_ids]
        # add labels
        for i in indices:
            labels[i] = label
        # increment label for next loop iteration
        label = label + 1
    
    logging.info("Running UMAP embedding.")
    fitter = umap.UMAP(n_neighbors=15, 
                       n_components=5, 
                       metric='cosine',
                       verbose=True).fit(data, y=labels)
    embedding = fitter.embedding_
    
    fig, ax = plt.subplots(1, figsize=(14, 10))
    plt.scatter(*embedding.T, s=0.1, c=target, cmap='Spectral', alpha=1.0)
    plt.setp(ax, xticks=[], yticks=[])
    cbar = plt.colorbar(boundaries=np.arange(11)-0.5)
    cbar.set_ticks(np.arange(10))
    cbar.set_ticklabels([group["history"][0]["label"]])
    plt.title('Clusters');
    fig.savefig('clusters.png', dpi=fig.dpi)


'''

subset = df[:10000]
subset2 = df[50000:60000]

emb = subset["selftextVector"].to_list()
emb2 = subset2["selftextVector"].to_list()

logging.info("Embedding umap.")
umap_embeddings = umap.UMAP(n_neighbors=15, 
                            n_components=5, 
                            metric='cosine',
                            verbose=True).fit_transform(emb)

logging.info("Clustering with HDBSCAN.")
cluster = hdbscan.HDBSCAN(min_cluster_size=5,
                          metric='euclidean',                      
                          cluster_selection_method='eom').fit(umap_embeddings)
# Reduce to 2 dimensions
umap_data = umap.UMAP(n_neighbors=15, n_components=2, min_dist=0.0, metric='cosine').fit_transform(emb)
result = pd.DataFrame(umap_data, columns=['x', 'y'])
result['labels'] = cluster.labels_

logging.info("Visualizing.")
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

logging.info("Calculating word frequency.")
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

logging.info("Running topic extractions.")

top_n_words = extract_top_n_words_per_topic(tf_idf, count, docs_per_topic, n=20)
topic_sizes = extract_topic_sizes(docs_df)

topic_sizes.sort_values('Size', ascending=False, inplace=True)
top_sizes = topic_sizes[1:]
plt.bar(top_sizes['Topic'], top_sizes['Size'])
plt.title('Size of Topics for Sample 1')

fig.savefig('topics.png', dpi=fig.dpi)
'''