# boilerplate
import tqdm, numpy as np, pickle
import matplotlib.pyplot as plt
import logging
from bson.objectid import ObjectId
import gc
from pathlib import Path
import time

# ml dependencies
import umap
import hdbscan
from sklearn.metrics.pairwise import euclidean_distances
import spacy

# local files
import utils
import tasks

def cluster_by_groups(userid, group_id_strings, session_oid, limit=10000):
    """
    Cluster documents using user-provided group ids.

    input:
        userid: ObjectID
        group_id_strings: list(string) where the strings are group ids
        session_oid: ObjectID
    """
    start = time.time()

    # connect to the database
    db = utils.connect()
    
    # Create ObjectIds
    group_ids = [ObjectId(str(id)) for id in group_id_strings]

    # start by getting the groups
    logging.info(f'Getting all groups in {group_ids}.')
    groups = list(db.groups.find({"_id":{"$in" : group_ids}}))

    # pull distance matrix from ~/embeddings
    # TODO - if we chose to use this some modifications will need to be made below
    # dm, document_ids = cache_distance_matrix()

    # TODO- pull dist max and doc ids from average of teleo vecs
    # dm, document_ids = average_teleoscop_ordering(db, groups)

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

    # given_labels[{group name}]: {hdbscan label}
    given_labels = {}

    for group in group_doc_indices:
        
        labels = hdbscan_labels[group_doc_indices[group]] 
        correct_label = max(labels)
        
        if -1 in labels:
            for i in range(len(labels)):

                # update outlier label to correct label 
                if labels[i] == -1:
                    index = group_doc_indices[group][i]
                    hdbscan_labels[index] = correct_label
        
        given_labels[group] = correct_label

    # spaCy preprocessing object for machine labels
    nlp = spacy.load("en_core_web_sm")

    # if user already has clusters, delete them to prepare for new clusters
    if db.clusters.count_documents({"history.user": userid}, limit=1):
        logging.info(f'Clusters for user exists. Delete all.')
        db.clusters.delete_many({"history.user": userid})
    logging.info(f'No clusters for user. Ready to populate.')

    # for garbage collection
    del dm
    del document_vectors
    gc.collect()
    
    # create a new mongoDB group for each machine cluster
    for hdbscan_label in set(hdbscan_labels):
        
        # array of indices of documents with current hdbscan label
        document_indices_array = np.where(hdbscan_labels == hdbscan_label)[0]
        
        # all document_ids as array
        ids = np.array(document_ids)
        
        # array of ids of documents with current hdbscan label 
        label_ids = ids[document_indices_array]

        # create list of document ids that are in current hdbscan label
        documents = label_ids.tolist()
        
        # create appropriate label for current hdbscan label
        _label, _color = get_label(hdbscan_label, given_labels)
        
        # learn a topic label for machine clusters
        if _label == 'machine':
            limit = min(20, len(label_ids))
            _label = get_topic(label_ids[:limit], db, nlp)

        logging.info(f'There are {len(documents)} documents for Machine Cluster "{_label}".')

        tasks.add_group(
            userid=userid,
            label=_label,
            color=_color,
            session_id=session_oid, 
            human=False, 
            included_documents=documents, 
        )

    end = time.time()
    diff = end - start
    logging.info(f'Built {max(hdbscan_labels)+2} clusters in {diff} seconds')

def get_label(hdbscan_label, given_labels):
    """
    Identify and produce label & colour for given hdbscan label

    Parameters
    -------------
    hdbscan_label : (int)
        machine label for current document
    given_labels : (dict[string]: (int))
        labels associated with human clusters

    Returns
    -------------
    (string) label
    (string) hex color value
    """
    check = more = False
    
    # outlier label
    if hdbscan_label == -1:
        return 'outliers', '#700c1d'

    # check for human clusters
    for _name in given_labels:

        label = given_labels[_name]
        
        if (hdbscan_label == label):
            # append group labels if multiple groups are given the same hdbscan label
            if more:
                name += " & " + _name 
            else:
                name = _name
                more = check = True
    
    if check:
        return name, '#15540d'

    return 'machine', '#737373'

def get_topic(label_ids, db, nlp):
    """
    Provides a two-word topic label for a machine cluster

    Parameters
    -------------
    label_ids : 
        array if documents ids for a machine cluster
    db : 
        mongoDB connection
    nlp : 
        spaCy preprocessing helper

    Returns
    -------------
    (string) label
    """

    docs = [] 
    
    # create a small corpus of documents that represent a machine cluster
    label_ids = label_ids.tolist()
    cursor = db.documents.find({"id":{"$in": label_ids}})
    for document in tqdm.tqdm(cursor):
        docs.append(document["text"])
    
    # use spaCy to preprocess text
    docs_pp = [preprocess(text) for text in nlp.pipe(docs)]

    # transform corpus to bag of words
    from sklearn.feature_extraction.text import CountVectorizer
    vec = CountVectorizer(stop_words='english')
    X = vec.fit_transform(docs_pp)

    # apply LDA topic modelling reduction
    from sklearn.decomposition import LatentDirichletAllocation
    lda = LatentDirichletAllocation(
        n_components=1, 
        learning_method="batch", 
        max_iter=10
    )
    lda.fit_transform(X)

    # grab two most similar topic labels for machine cluster
    sorting = np.argsort(lda.components_, axis=1)[:, ::-1]
    feature_names = np.array(vec.get_feature_names_out())
    topic = feature_names[sorting[0][0]] + " " + feature_names[sorting[0][1]]
    
    return topic

def average_teleoscop_ordering(db, groups, limit=10000):
    """
    Compute distance matrix and list of document ids based on average of groups' teleoscopes

    Parameters
    -------------
    db :
        mongoDB connection
    group : 
        list of user defined groups

    Returns
    -------------
    (ndarray) distance matrix
    (list(string)) list of document ids
    """

    # get teleoscope vecs of all groups
    teleo_vecs = []
    for group in groups:

        teleoscope_oid = group["teleoscope"]
        teleoscope = db.teleoscopes.find_one({"_id": ObjectId(str(teleoscope_oid))})
        teleo_vecs.append(teleoscope["history"][0]["stateVector"])

    teleo_vecs = np.array(teleo_vecs)

    # compute average teleoscope vec
    avg_vec = np.average(teleo_vecs, axis=0)

    # get document ids / vecs from embedding
    path = '~/embeddings/'
    dir = Path(path).expanduser()
    dir.mkdir(parents=True, exist_ok=True)
    npzpath = Path(path + 'embeddings.npz').expanduser()
    pklpath = Path(path + 'ids.pkl').expanduser()
    
    logging.info("Documents have been cached, retrieving now.")
    loadDocuments = np.load(npzpath.as_posix(), allow_pickle=False)
    with open(pklpath.as_posix(), 'rb') as handle:
        doc_ids = pickle.load(handle)
    doc_vecs = loadDocuments['documents']

    # gather ordering based on average vector
    vecs = utils.calculateSimilarity(doc_vecs, avg_vec)[:limit] # TODO-SOMETHING WRONG HERE
    ids = utils.rankDocumentsBySimilarity(doc_ids, vecs)
    dm = euclidean_distances(vecs)
    logging.info(f'The distance matrix has shape: {dm.shape}')

    return dm, ids

def cache_distance_matrix():
    """
    Cache a distance matrix built off all documents in database

    Parameters
    -------------
    db : 
        mongoDB connection

    Returns
    -------------
    (ndarray) distance matrix
    (list(string)) list of document ids
    """

    path='~/embeddings/'
    dir = Path(path).expanduser()
    dir.mkdir(parents=True, exist_ok=True)
    cluspath = Path(path + 'clustering.npz').expanduser()
    npzpath = Path(path + 'embeddings.npz').expanduser()
    pklpath = Path(path + 'ids.pkl').expanduser()
    
    logging.info("Retrieving all document ids from embeddings.")
    with open(pklpath.as_posix(), 'rb') as handle:
        ids = pickle.load(handle)
    
    if cluspath.exists():
        logging.info("Distance matrix is cached, retrieving now.")
        loaded = np.load(cluspath.as_posix(), allow_pickle=False)
        dm = loaded['dist_matrix']
        with open(pklpath.as_posix(), 'rb') as handle:
            ids = pickle.load(handle)
    
    else:
        logging.info("Distance matrix are not cached, building matrix now.")
        loadDocuments = np.load(npzpath.as_posix(), allow_pickle=False)
        vecs = loadDocuments['documents']

        dm = euclidean_distances(vecs)
        logging.info(f'The distance matrix has shape: {dm.shape}')

        np.savez(cluspath.as_posix(), dist_matrix=dm)
    
    return dm, ids

# code by Dr. Varada Kolhatkar adapted from cpsc330
def preprocess(
    doc,
    min_token_len=2,
    irrelevant_pos=["ADV", "PRON", "CCONJ", "PUNCT", "PART", "DET", "ADP", "SPACE"],
):
    """
    Given text, min_token_len, and irrelevant_pos carry out preprocessing of the text
    and return a preprocessed string.

    Parameters
    -------------
    doc : (spaCy doc object)
        the spacy doc object of the text
    min_token_len : (int)
        min_token_length required
    irrelevant_pos : (list)
        a list of irrelevant pos tags

    Returns
    -------------
    (str) the preprocessed text
    """

    clean_text = []

    for token in doc:
        if (
            token.is_stop == False  # Check if it's not a stopword
            and len(token) > min_token_len  # Check if the word meets minimum threshold
            and token.pos_ not in irrelevant_pos
        ):  # Check if the POS is in the acceptable POS tags
            lemma = token.lemma_  # Take the lemma of the word
            clean_text.append(lemma.lower())
    return " ".join(clean_text)