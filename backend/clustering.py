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
from sklearn.metrics.pairwise import euclidean_distances
from pathlib import Path



def cluster_by_groups(userid, group_id_strings, session_oid, limit=10000):
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

    # pull distance matrix from ~/embeddings
    # dm, document_ids = cacheClusteringData(db)

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
        
    logging.info("Appending documents from groups to document vector and id list...")
    
    group_doc_indices = {}
    for group in groups:
        
        # grab latest history item for each group
        group_document_ids = group["history"][0]["included_documents"]
        
        indices = []
        
        for id in group_document_ids:
            
            try:
                document_ids.index(id)
            
            except:
                document = db.documents.find_one({"id": id}, projection=projection)
                document_ids.append(id)
                vector = np.array(document["textVector"]).reshape((1, 512))
                document_vectors = np.append(document_vectors, vector, axis=0)
                
            finally:
                indices.append(document_ids.index(id))
        
        # dict where keys are group names and values are indices of documents
        group_doc_indices[group["history"][0]["label"]] = indices


    # for garbage collection
    del ordered_documents
    del cursor
    gc.collect()

    logging.info(f'Document vectors has the shape:  {document_vectors.shape}.') # e.g., (600000, 512)

    logging.info("Building distance matrix from document vectors array")
    dm = euclidean_distances(document_vectors)

    logging.info(f"Distance matrix has shape {dm.shape}.") # e.g., (10000, 10000) square matrix

    # update distance matrix such that documents in the same group have distance 0
    # TODO - improve hacky code below (map function?)
    for group in group_doc_indices:
    
        indices = group_doc_indices[group]
        size = range(len(indices))

        for _i in size:
            i = indices[_i]

            for _j in size:
                j = indices[_j]
                dm[i, j] = 0 


    logging.info("Running UMAP Reduction...")

    umap_embeddings = umap.UMAP(
        verbose = True,         # for logging
        metric = "precomputed", # use distance matrix
        n_components = 30,      # reduce to n_components dimensions (2:100)
        # n_neighbors = 10,     # local (small n ~2) vs. global (large n ~100) structure 
        min_dist = 0.0,         # minimum distance apart that points are allowed (0.0:0.99)
    ).fit_transform(dm)

    logging.info(f"Shape after reduction: {umap_embeddings.shape}")
    
    logging.info("Clustering with HDBSCAN...")

    hdbscan_labels = hdbscan.HDBSCAN(
        min_cluster_size = 10,              # n-neighbors needed to be considered a cluster (0:50 df=5)
        # min_samples = 5,                  # how conservative clustering will be, larger is more conservative (more outliers) (df=None)
        cluster_selection_epsilon = 0.2,    # have large clusters in dense regions while leaving smaller clusters small
                                            # merge clusters if inter cluster distance is less than thres (df=0)
    ).fit_predict(umap_embeddings)

    logging.info(f'Num Clusters = {max(hdbscan_labels)+1} + outliers')

    # build dict where key is group name and value is label given by clustering
    given_labels = {}
    for group in group_doc_indices:

        for index in group_doc_indices[group]:
            if hdbscan_labels[index] != -1:
                given_labels[group] = hdbscan_labels[index]
                break
    
    # create a new mongoDB group for each machine cluster
    for hdbscan_label in set(hdbscan_labels):

        # identify if current hdbscan label is one associate with a human cluster
        check, name = is_human_cluster(hdbscan_label, given_labels)

        if hdbscan_label == -1:
            _label = f"{hdbscan_label} (outliers)"
        elif check: 
            _label = f"{hdbscan_label} ({name})" # label machine cluster based on human cluster accordingly
        else:
            _label = str(hdbscan_label)
     
        # get indices for documents with current hdbscan label
        document_indices_scalar = np.where(hdbscan_labels == hdbscan_label)[0]
        document_indices = [int(i) for i in document_indices_scalar]
        
        documents = []
        for i in document_indices:
            documents.append(document_ids[i])

        logging.info(f'There are {len(documents)} documents for Machine Cluster {_label}.')

        tasks.add_group(
            userid=userid,
            label=_label,
            color="#8c564b",
            session_id=session_oid, 
            human=False, 
            included_documents=documents, 
        )


def is_human_cluster(hdbscan_label, given_labels):
    """
    Check to see if current hdbscan label is a label given to a human cluster
    
    input:
        hdbscan_label (int): current label
        given_labels (dict): machine labels given to human clusters
    output:
        check (bool): if current label is a label given to human clusters
        name (string): label for human cluster(s)
    """
    name = None
    check = more = False

    for _name in given_labels:

        # label of human cluster
        label = given_labels[_name]
        
        # check if machine label matches label given to human cluster
        if (hdbscan_label == label):

            # append name of human cluster if machine label is shared
            if more:
                name += " & " + _name

            # labels match so update outputs 
            else:
                name = _name
                check = more = True
            
    return check, name

def cacheClusteringData(db):
    """
    Check to see if distance matrix and list of document ids is cached in ~/embeddings
    
    input:
        db: mongoDB connection
    output:
        dm: distance matrix
        ids: list of document ids
    """
    path='~/embeddings/'
    dir = Path(path).expanduser()
    dir.mkdir(parents=True, exist_ok=True)
    npzpath = Path(path + 'clustering.npz').expanduser()
    
    if npzpath.exists():
        logging.info("Documents have been cached, retrieving now.")
        loaded = np.load(npzpath.as_posix(), allow_pickle=False)
        dm = loaded['dist_matrix']
        ids = loaded['doc_ids'].tolist()
    
    else:
        logging.info("Documents are not cached, building cache now.")
        # db = utils.connect()
        allDocuments = utils.getAllDocuments(db, projection={'id':1, 'textVector':1, '_id':0}, batching=True, batchSize=10000)
        ids = [x['id'] for x in allDocuments]
        logging.info(f'There are {len(ids)} ids in documents.')

        vecs = np.array([x['textVector'] for x in allDocuments])
        dm = euclidean_distances(vecs)
        logging.info(f'The distance matrix has shape: {dm.shape}')

        np.savez(npzpath.as_posix(), dist_matrix=dm, doc_ids=ids)
    
    return dm, ids