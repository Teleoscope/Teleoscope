import tqdm, numpy as np
import matplotlib.pyplot as plt
import utils
import umap
import hdbscan
import matplotlib.pyplot as plt
from sklearn.feature_extraction.text import CountVectorizer
import logging
from bson.objectid import ObjectId
import gc
import argparse

parser = argparse.ArgumentParser()
parser.add_argument(
    '-d', '--debug',
    help="Print lots of debugging statements",
    action="store_const", dest="loglevel", const=logging.DEBUG,
    default=logging.WARNING,
)
parser.add_argument(
    '-v', '--verbose',
    help="Be verbose",
    action="store_const", dest="loglevel", const=logging.INFO,
)
args = parser.parse_args()    
logging.basicConfig(level=args.loglevel)



def cluster_by_groups(group_id_strings, teleoscope_oid, limit=100000):
    """Cluster documents using user-provided group ids.

    teleoscope_oid: GridFS OID address for ranked posts. 
    Note this assumes that a teleoscope has already been created for this group.

    group_id_strings : list(string) where the strings are MongoDB ObjectID format

    """
    # Create ObjectIds
    group_ids = [ObjectId(str(id)) for id in group_id_strings]

    # connect to the database
    db = utils.connect()

    # get Teleoscope from GridFS
    logging.info("Getting ordered posts...")
    all_ordered_posts = utils.gridfsDownload(db, "teleoscopes", ObjectId(str(teleoscope_oid)))
    ordered_posts = all_ordered_posts[0:limit]
    logging.info(f'Posts downloaded. Top post is {ordered_posts[0]} and length is {len(ordered_posts)}')
    limit = min(limit, len(ordered_posts))
    
    # start by getting the groups
    logging.info(f'Getting all groups in {group_ids}.')
    groups = list(db.groups.find({"_id":{"$in" : group_ids}}))
    
    # projection includes only fields we want
    projection = {'id': 1, 'selftextVector': 1}

    # cursor is a generator which means that it yields a new doc one at a time
    logging.info("Getting posts cursor and building post vector and id list...")
    cursor = db.clean.posts.v3.find(
        # query
        {"id":{"$in": [post[0] for post in ordered_posts]}},
        projection=projection,
        # batch size means number of posts at a time taken from MDB, no impact on iteration 
        batch_size=500
    )

    post_ids = []
    post_vectors = []

    # for large datasets, this will take a while. Would be better to find out whether the UMAP fns 
    # can accept generators for lazy calculation 
    for post in tqdm.tqdm(cursor, total=limit):
        post_ids.append(post["id"])
        post_vectors.append(post["selftextVector"])
        
    logging.info("Creating data np.array...")
    
    # initialize labels to array of -1 for each post # e.g., (600000,)
    # assuming a sparse labeling scheme
    data = np.array(post_vectors)
    labels = np.full(data.shape[0], -1)

    label = 1
    # add the correct labels to the label np.array
    for group in groups:
        # grab latest history item for each group
        group_post_ids = group["history"][0]["included_posts"]
        # save label just in case (not pushed to MongoDB, only local)
        group["label"] = label
        # get the index of each post_id so that it's aligned with the label np.array
        indices = []
        for id in group_post_ids:
            try:
                post_ids.index(id)
            except:
                logging.info(f'{id} not in current slice. Attempting to retreive from database...')
                post = db.clean.posts.v3.find_one({"id": id}, projection=projection)
                post_ids.append(id)
                vector = np.array(post["selftextVector"])
                data = np.append(data, vector)
                
        # add labels
        for i in indices:
            labels[i] = label
        # increment label for next loop iteration
        label = label + 1
    
    # for garbage collection
    del ordered_posts
    del post_ids
    del cursor
    gc.collect()

    logging.info(f'Post data np.array has shape {data.shape}.') # e.g., (600000, 512)

    logging.info("Running UMAP embedding.")
    fitter = umap.UMAP(verbose=True,
                       low_memory=True).fit(data, y=labels)
    
    embedding = fitter.embedding_

    labelnames = [group["history"][0]["label"] for group in groups]

    # drawing plots
    logging.info("Drawing plots...")
    fig, ax = plt.subplots(1, figsize=(14, 10))
    plt.scatter(*embedding.T, s=0.1, c=labels, cmap='Spectral', alpha=1.0)
    plt.setp(ax, xticks=[], yticks=[])
    cbar = plt.colorbar(boundaries=np.arange(len(labelnames) + 1)-0.5)
    cbar.set_ticks(np.arange(len(labelnames)))
    cbar.set_ticklabels(labelnames)
    plt.title('Clusters');
    fig.savefig('clusters.png', dpi=fig.dpi)
    logging.info("Plots saved.")

if __name__ == "__main__":
    cluster_by_groups(["62db047aaee56b83f2871510"], "62a7ca02d033034450035a91")

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