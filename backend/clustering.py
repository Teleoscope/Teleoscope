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

def cluster_by_groups(group_id_strings, session_oid, limit=10000):
    """Cluster documents using user-provided group ids.

    group_id_strings : list(string) where the strings are MongoDB ObjectID format

    session_oid: string OID for session to add clusters to

    """
    # connect to the database
    db = utils.connect()
    
    # Create ObjectIds
    group_ids = [ObjectId(str(id)) for id in group_id_strings]

    # start by getting the groups
    logging.info(f'Getting all groups in {group_ids}.')
    groups = list(db.groups.find({"_id":{"$in" : group_ids}}))

    # default to ordering documents relative to first group's teleoscope
    teleoscope_oid = groups[0]["teleoscope"]
    teleoscope = db.teleoscopes.find_one({"_id": ObjectId(str(teleoscope_oid))})


    # get Teleoscope from GridFS
    logging.info("Getting ordered documents...")
    all_ordered_documents = utils.gridfsDownload(db, "teleoscopes", ObjectId(str(teleoscope["history"][0]["ranked_document_ids"])))
    ordered_documents = all_ordered_documents[0:limit]
    logging.info(f'Documents downloaded. Top document is {ordered_documents[0]} and length is {len(ordered_documents)}')
    limit = min(limit, len(ordered_documents))
    
    # projection includes only fields we want
    projection = {'id': 1, 'textVector': 1}

    # cursor is a generator which means that it yields a new doc one at a time
    logging.info("Getting documents cursor and building document vector and id list...")
    cursor = db.documents.find(
        # query
        {"id":{"$in": [document[0] for document in ordered_documents]}},
        projection=projection,
        # batch size means number of documents at a time taken from MDB, no impact on iteration 
        batch_size=500
    )

    document_ids = []
    document_vectors = []

    # for large datasets, this will take a while. Would be better to find out whether the UMAP fns 
    # can accept generators for lazy calculation 
    for document in tqdm.tqdm(cursor, total=limit):
        document_ids.append(document["id"])
        document_vectors.append(document["textVector"])
        
    logging.info("Creating data np.array...")
    
    # initialize labels to array of -1 for each document # e.g., (600000,)
    # assuming a sparse labeling scheme
    data = np.array(document_vectors)
    labels = np.full(data.shape[0], -1)

    label = 1
    # add the correct labels to the label np.array
    total_tagged = 0
    #tagged_with_label = [None] * (len(group_id_strings)+1)
    cluster_stats_dict = {}
    for group in groups:
        label_count = 0
        # grab latest history item for each group
        group_document_ids = group["history"][0]["included_documents"]
        # save label just in case (not pushed to MongoDB, only local)
        group["label"] = label
        # get the index of each document_id so that it's aligned with the label np.array
        indices = []
        for id in group_document_ids:
            try:
                document_ids.index(id)
            except:
                logging.info(f'{id} not in current slice. Attempting to retreive from database...')
                document = db.documents.find_one({"id": id}, projection=projection)
                document_ids.append(id)
                vector = np.array(document["textVector"]).reshape((1, 512))
                data = np.append(data, vector, axis=0)
                labels = np.append(labels, -1)
                
        # add labels
        for i in indices:
            labels[i] = label
            #logging.info(f'label found')

        # stats for this particular label
        label_count = np.count_nonzero(labels == label)
        coverage = (label_count/len(ordered_posts))*100
        total_tagged = total_tagged + label_count
        cluster_stats_dict[label] = label_count
        #tagged_with_label[label] = label_count
        logging.info(f'There are {label_count} posts that have the label {label}. This is {coverage}% of the ordered posts.')
        # increment label for next loop iteration
        label = label + 1
    
    total_coverage = (total_tagged/len(ordered_posts))*100
    logging.info(f'Overall, there are {total_tagged} posts that have been given a human label. This is {total_coverage}% of the ordered posts.')
    # update number of unlabelled posts
    cluster_stats_dict[-1] = np.count_nonzero(labels == -1)
    logging.info(f'The dict now contains {cluster_stats_dict}.')

    # for garbage collection
    del ordered_documents
    del cursor
    gc.collect()

    logging.info(f'Document data np.array has shape {data.shape}.') # e.g., (600000, 512)

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
        document_indices_scalar = np.where(label_array == hdbscan_label)[0]
        logging.info(f'Document indices is {document_indices_scalar[0]}.')
        document_indices = [int(i) for i in document_indices_scalar]
        documents = []
        for i in document_indices:
            documents.append(document_ids[i])
        
        logging.info(f'There are {len(documents)} documents for MLGroup {hdbscan_label}.')
        tasks.add_group(
            human=False, 
            session_id=session_oid, 
            color="#8c564b",
            included_documents=documents, 
            label=int(hdbscan_label),
            username="clustering"
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