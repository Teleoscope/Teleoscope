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
import spacy

def cluster_by_groups(userid, group_id_strings, session_oid, limit=10000):
    """
    Cluster documents using user-provided group ids.

    input:
        userid: ObjectID
        group_id_strings: list(string) where the strings are group ids
        session_oid: ObjectID
    """
    # connect to the database
    db = utils.connect()
    
    # Create ObjectIds
    group_ids = [ObjectId(str(id)) for id in group_id_strings]

    # start by getting the groups
    logging.info(f'Getting all groups in {group_ids}.')
    groups = list(db.groups.find({"_id":{"$in" : group_ids}}))

    # pull distance matrix from ~/embeddings
    # TODO - if we chose to use this some modifications will need to be made below
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

# TODO - check to see if user already has clusters, if yes, delete them to accomodate new

# TODO ADD COMMENTS
    for group in group_doc_indices:
        
        labels = hdbscan_labels[group_doc_indices[group]] 
        correct_label = max(labels)
        
        if -1 in labels:
            for i in range(len(labels)):
                if labels[i] == -1:
                    index = group_doc_indices[group][i]
                    hdbscan_labels[index] = correct_label
        
        given_labels[group] = correct_label

    # spaCy preprocessing object for machine labels
    nlp = spacy.load("en_core_web_md", disable=["parser", "ner"])
    
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
            _label = get_topic(label_ids[:limit], limit, db, nlp)

        logging.info(f'There are {len(documents)} documents for Machine Cluster "{_label}".')

        tasks.add_group(
            userid=userid,
            label=_label,
            color=_color,
            session_id=session_oid, 
            human=False, 
            included_documents=documents, 
        )


def get_label(hdbscan_label, given_labels):
    """
    Provides a two-word topic label for a machine cluster

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
# TODO ADD COMMENTS / LOGGING
    check = more = False
    
    if hdbscan_label == -1:
        return 'outliers', '#700c1d'

    for _name in given_labels:

        label = given_labels[_name]
        
        if (hdbscan_label == label):
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
        the first 20 documents ids for a given machine cluster
    db : 
        mongoDB connection
    nlp : 
        spaCy preprocessing helper

    Returns
    -------------
    (string) label
    """
# TODO ADD COMMENTS / LOGGING
    docs = [] 
    
    label_ids = label_ids.tolist()
    cursor = db.documents.find({"id":{"$in": label_ids}})

    for document in tqdm.tqdm(cursor):
        docs.append(document["text"])
    
    docs_pp = [preprocess(text) for text in nlp.pipe(docs)]

    from sklearn.feature_extraction.text import CountVectorizer

    vec = CountVectorizer(stop_words='english')
    X = vec.fit_transform(docs_pp)

    from sklearn.decomposition import LatentDirichletAllocation

    lda = LatentDirichletAllocation(
        n_components=1, 
        learning_method="batch", 
        max_iter=10
    )
    
    lda.fit_transform(X)
    sorting = np.argsort(lda.components_, axis=1)[:, ::-1]
    feature_names = np.array(vec.get_feature_names_out())
    topic = feature_names[sorting[0][0]] + " " + feature_names[sorting[0][1]]
    
    return topic

def cacheClusteringData(db):
    """
    Check to see if distance matrix and list of document ids is cached in ~/embeddings

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