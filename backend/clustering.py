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

def cluster_by_groups(group_id_strings, teleoscope_oid, session_oid, limit=100000):
    """Cluster documents using user-provided group ids.

    teleoscope_oid: GridFS OID address for ranked posts. 
    Note this assumes that a teleoscope has already been created for this group.

    group_id_strings : list(string) where the strings are MongoDB ObjectID format

    session_oid: string OID for session to add mlgroups to

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
                vector = np.array(post["selftextVector"]).reshape((1, 512))
                data = np.append(data, vector, axis=0)
                labels = np.append(labels, -1)
                
        # add labels
        for i in indices:
            labels[i] = label
        # increment label for next loop iteration
        label = label + 1
    
    # for garbage collection
    del ordered_posts
    del cursor
    gc.collect()

    logging.info(f'Post data np.array has shape {data.shape}.') # e.g., (600000, 512)

    logging.info("Running UMAP embedding.")
    fitter = umap.UMAP(verbose=True,
                       low_memory=True).fit(data, y=labels)
    
    embedding = fitter.embedding_

    umap_embeddings = fitter.transform(data)
    
    logging.info("Clustering with HDBSCAN.")

    hdbscan_labels = hdbscan.HDBSCAN(
                        min_samples=10,
                        min_cluster_size=500,
    ).fit_predict(umap_embeddings)

    logging.info(f'HDBScan labels are in set {set(hdbscan_labels)}.')

    label_array = np.array(hdbscan_labels)

    for hdbscan_label in set(hdbscan_labels):
        post_indices_scalar = np.where(label_array == hdbscan_label)[0]
        logging.info(f'Post indices is {post_indices_scalar[0]}.')
        post_indices = [int(i) for i in post_indices_scalar]
        posts = []
        for i in post_indices:
            posts.append(post_ids[i])
        
        logging.info(f'There are {len(posts)} posts for MLGroup {hdbscan_label}.')
        tasks.add_group(
            human=False, 
            session_id=session_oid, 
            color="#8c564b",
            included_posts=posts, 
            label=int(hdbscan_label)
        )

    # drawing plots
    logging.info("Drawing plots...")
    clustered = (hdbscan_labels >= 0)
    plt.scatter(umap_embeddings[~clustered, 0],
                umap_embeddings[~clustered, 1],
                color=(0.5, 0.5, 0.5),
                s=0.1,
                alpha=0.5)
    plt.scatter(umap_embeddings[clustered, 0],
                umap_embeddings[clustered, 1],
                c=hdbscan_labels[clustered],
                s=0.1,
                cmap='Spectral');

    plt.savefig("hdbscan.png")
    plt.clf()

    labelnames = [group["history"][0] for group in groups]

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
    cluster_by_groups(["62db047aaee56b83f2871510"], "62a7ca02d033034450035a91", "632ccbbdde62ba69239f6682")