# boilerplate
import tqdm, numpy as np, pickle
import matplotlib.pyplot as plt
import logging, pickle
from bson.objectid import ObjectId
import gc
from pathlib import Path
import time
import gridfs
import datetime

# ml dependencies
import umap
import hdbscan
from sklearn.metrics.pairwise import euclidean_distances
import spacy

# local files
import utils
import tasks

class Clustering:
    """Semi-supervised Clustering 

    The purpose of this class is to cluster a corpus--limited to a subset defined 
    by the limit param plus the documents in the provided human clusters/groups.
    """

    def __init__(self, user_id, group_id_strings, session_id, db, limit=10000, topic_label_length=2):
        """Initializes the instance 

        Args:
            user_id:
                An ObjectID representing the user who made the API call
            group_id_strings:
                A list of strings representing the ObjectID of each group to be clustered
            session_id:
                A string that represents the ObjectID of the current session
            db: 
                A string that specifies the current database
            limit:
                The number of documents to cluster. Default 10000
            topic_label_length:
                Minimum number of words to use for machine cluster topic labels. Default 2
        """

        self.dbstring = db
        self.user_id = user_id
        self.group_id_strings = group_id_strings
        self.session_id = session_id
        self.limit = limit
        self.topic_label_length = topic_label_length
        self.description = ""
        self.db = utils.connect(db=self.dbstring)
        self.nlp = spacy.load("en_core_web_sm")
        self.group_doc_indices = None
        self.groups = None

        # large lists (number of examples)
        self.document_ids = None    
        self.hdbscan_labels = None

        # TODO - can we set this up as a transaction session so it dies if we dont succeed
        self.clustering_task()

    def clustering_task(self):
        """Cluster documents using user-defined groups.
        """

        start = time.time()

        # if user already has clusters, delete them to prepare for new clusters
        self.clean_mongodb()
        
        # get groups from mongodb
        group_ids = [ObjectId(str(id)) for id in self.group_id_strings]
        self.groups = list(self.db.groups.find({"_id":{"$in" : group_ids}}))

        # build distance matrix, run dimensionality reduction, run clustering
        self.learn_clusters()

        # iteratively add clusters (as groups) to database
        self.build_clusters()

        # report basic statistics
        total_time = time.time() - start
        self.session_action(total_time)

    def learn_clusters(self):
        """ Learn cluster labels: build distance matrix, run dimensionality reduction, run clustering
        """

        # build training set
        dm = self.document_ordering()

        logging.info("Running UMAP Reduction...")
        umap_embeddings = umap.UMAP(
            verbose = True,         # for logging
            metric = "precomputed", # use distance matrix
            n_components = 30,      # reduce to n_components dimensions (2~100)
            # n_neighbors = 10,     # local (small n ~2) vs. global (large n ~100) structure 
            min_dist = 1e-5,        # minimum distance apart that points are allowed (0.0~0.99)
        ).fit_transform(dm)
        logging.info(f"Shape after reduction: {umap_embeddings.shape}")
        
        logging.info("Clustering with HDBSCAN...")
        self.hdbscan_labels = hdbscan.HDBSCAN(
            min_cluster_size = 10,              # num of neighbors needed to be considered a cluster (0~50, df=5)
            # min_samples = 5,                  # how conservative clustering will be, larger is more conservative (more outliers) (df=None)
            cluster_selection_epsilon = 0.2,    # have large clusters in dense regions while leaving smaller clusters small
                                                # merge clusters if inter cluster distance is less than thres (df=0)
        ).fit_predict(umap_embeddings)
        
        logging.info(f'Num Clusters = {max(self.hdbscan_labels)+1} + outliers')

    def build_clusters(self):
        """ Iteratively builds groups in mongoDB relative to clustering
        """

        # identify what machine label was given to each group
        given_labels = self.get_given_labels()

        # keep track of all topic labels (for collisions)
        topic_labels = []

        # create a new mongoDB group for each machine cluster
        for hdbscan_label in set(self.hdbscan_labels):
            
            # array of indices of documents with current hdbscan label
            document_indices_array = np.where(self.hdbscan_labels == hdbscan_label)[0]
            
            # all document_ids as array
            ids = np.array(self.document_ids)
            
            # array of object ids of documents with current hdbscan label 
            label_ids = ids[document_indices_array]

            # create list of document object ids that are in current hdbscan label
            documents = label_ids.tolist()
            
            # create appropriate label for current hdbscan label
            _label, _color = self.get_label(hdbscan_label, given_labels)
            
            # learn a topic label for if current cluster is a machine cluster
            if _label == 'machine':
                limit = min(20, len(label_ids))
                _label = self.get_topic(label_ids[:limit], topic_labels)
                topic_labels.append(_label)

            logging.info(f'There are {len(documents)} documents for Machine Cluster "{_label}".')
            
            tasks.add_group(
                userid=self.user_id,
                label=_label,
                color=_color,
                session_id=self.session_id, 
                human=False, 
                included_documents=documents, 
                description=self.description,
                db=self.dbstring
            )
        
    def get_given_labels(self):
        """ Build the given_labels dictionary

        Returns:
            given_labels:
                dict where keys are group names and values are the given hdbscan label
        """
        
        given_labels = {}
        for group in self.group_doc_indices:
            
            # list of labels given to docs in group
            labels = self.hdbscan_labels[self.group_doc_indices[group]] 
            # get non -1 label (if exists)
            correct_label = -1 if len(labels) is 0 else max(labels)
            
            # if any documents were given -1, make sure they are set to correct_label
            if -1 in labels:
                for i in range(len(labels)):
                    if labels[i] == -1:
                        index = self.group_doc_indices[group][i]
                        self.hdbscan_labels[index] = correct_label
            
            given_labels[group] = correct_label

        return given_labels
    
    def document_ordering(self):
        """ Build a training set besed on the average of groups' document vectors

        Returns:
            dm:
                a diagonal matrix containing where elements are distances between documents
        """
        
        logging.info("Gathering all document vectors from embeddings...")
        # grab all document data from embeddings
        reorient = tasks.reorient()
        reorient.dbstring = self.dbstring
        all_doc_ids, all_doc_vecs = reorient.cacheDocumentsData()
        
        logging.info('Using average ordering...')
        # build a list of ids of documents in all groups 
        docs = []
        for group in self.groups:
            group_document_ids = group["history"][0]["included_documents"]
            docs += group_document_ids

        # compute average vector
        vec = reorient.average(docs)

        logging.info("Gather similarly scores based on vector...")
        # gather similarly scores based on average vector
        scores = utils.calculateSimilarity(all_doc_vecs, vec)

        logging.info("Sorting document ids based on scores...")
        # sort document ids based on scores and take subset based on limit param
        document_ids = utils.rank_document_ids_by_similarity(all_doc_ids, scores)[:self.limit]

        # indices of ranked ids
        indices = [all_doc_ids.index(i) for i in document_ids]

        logging.info("Building sorted array of document vectors...")
        # use indices of ranked ids to build sorted array of document vectors
        document_vectors = np.array([all_doc_vecs[i] for i in indices])

        # dict where keys are group names and values are indices of documents
        group_doc_indices = {}
        
        # make sure documents in groups are included in training sets
        logging.info("Appending documents from groups to document vector and id list...")
        for group in self.groups:

            group_document_ids = group["history"][0]["included_documents"]

            indices = []

            for str_id in group_document_ids:

                # see if document is already in training sets
                try:
                    id = ObjectId(str(str_id))
                    document_ids.index(str(id))

                # if not add document to training sets
                except:
                    document = self.db.documents.find_one(
                        {"_id": id},
                        projection={'textVector': 1},
                    )
                    if not document: raise Exception(f"Document {str(id)} not found")
                    document_ids.append(str(id))
                    vector = np.array(document["textVector"]).reshape((1, 512))
                    document_vectors = np.append(document_vectors, vector, axis=0)

                # get index of document in group with respect to training sets
                finally:
                    indices.append(document_ids.index(str(id)))

            group_doc_indices[group["history"][0]["label"]] = indices

        # build distance matrix
        logging.info("Building distance matrix...")
        dm = euclidean_distances(document_vectors)
        logging.info(f"Distance matrix has shape {dm.shape}.") # n-by-n symmetrical matrix

        # update distance matrix such that documents in the same group have distance ~0
        INTRA_CLUSTER_DISTANCE = 1e-4
        for group in group_doc_indices:

            indices = group_doc_indices[group]
            size = range(len(indices))

            for _i in size:
                i = indices[_i]

                for _j in size:
                    j = indices[_j]
                    dm[i, j] *= INTRA_CLUSTER_DISTANCE

        self.group_doc_indices = group_doc_indices
        self.document_ids = document_ids

        return dm

    def get_label(self, hdbscan_label, given_labels):
        """Identify and produce label & colour for given hdbscan label

        Args:
            hdbscan_label:
                An int that represents the given machine label 
            given_labels:
                dict where keys are group names and values are the given hdbscan label

        Returns:
            label:
                A string that is the topic label for the machine cluster
            colour:
                A string of hex representing a colour
        """
        
        check = more = False
        
        # outlier label
        if hdbscan_label == -1:
            self.description = "outlier documents"
            return 'outliers', '#ff1919'

        # check if hdbscan_label was for a human cluster(s)
        for _name in given_labels:

            label = given_labels[_name]
            
            if (hdbscan_label == label):
                
                # append group labels if multiple human clusters are given the same hdbscan label
                if more:
                    name += " & " + _name 

                # on first instance of label match, just return name
                else:
                    name = _name
                    check = more = True
        
        if check:
            self.description = "your group"
            return name, '#ff70e2'

        # return for if label is newly generated machine cluster
        return 'machine', '#737373'

    def get_topic(self, label_ids, topic_labels):
        """Provides a topic label for a machine cluster

        Args:
            label_ids: 
                An array of strings that represent documents ids in a machine cluster.
            topic_lables:
                list of all given labels to machine clusters

        Returns:
            topic:
                A string that is the topic label for the machine cluster
            description:
                A 10 word machine generated description 
        """

        docs = [] 
        
        # build a small corpus of documents that represent a machine cluster
        for id in label_ids:
            document = list(self.db.documents.find(
                {"_id": ObjectId(str(id))},
                projection = {'text': 1},
            ))
            docs.append(document[0]["text"])
            
        # use spaCy to preprocess text
        docs_pp = [self.preprocess(text) for text in self.nlp.pipe(docs)]

        # transform as bag of words with tf-idf strategy
        from sklearn.feature_extraction.text import TfidfVectorizer
        vec = TfidfVectorizer()
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

        label = ""
        for i in range(self.topic_label_length):
            if i > 0: label += " "
            try:
                label += feature_names[sorting[0][i]]
            except:
                pass

        # build a 7 word description from frequent topic labels
        self.description = feature_names[sorting[0][0]]
        for i in range(1, min(8, len(sorting[0]))):
            self.description += " " + feature_names[sorting[0][i]]

        # check for collisions with existing labels; if yes, append another topic label. 
        i = self.topic_label_length
        while(1):
            if label not in topic_labels:
                return label
            else:
                label += " " + feature_names[sorting[0][i]]
                i += 1

    def preprocess(self, doc):
        """Preprocess text

        Code by Dr. Varada Kolhatkar adapted from UBC CPSC 330

        Given text, min_token_len, and irrelevant_pos carry out preprocessing of the text
        and return a preprocessed string.

        Args:
            doc:
                The spacy doc object of the text

        Returns:
            preprocessed_text:
                Preprocessed text as a String
        """
                
        # An int that represents min_token_length required
        min_token_len = 2
        # A list of irrelevant pos tags
        irrelevant_pos = ["ADV", "PRON", "CCONJ", "PUNCT", "PART", "DET", "ADP", "SPACE"]

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

    def clean_mongodb(self):
        """Cleans up MongoDB objects

        Check to see if user has already built clusters.
        If so, need to delete clusters and associated teleoscope items
        """

        db = self.db
        session_id = ObjectId(str(self.session_id))

        # check to see user has any clusters
        if db.clusters.count_documents(
            {"session" : session_id}, 
            limit=1,
        ):
            
            logging.info(f'Clusters for user exists. Delete all.')

            # get session's clustering data
            session = db.sessions.find_one({'_id': session_id})
            history_item = session["history"][0]
            
            # # teleoscopes no longer auto generated. 
            # teleoscopes = history_item["teleoscopes"] 
            # namespace = "teleoscopes" # teleoscopes.chunks, teleoscopes.files
            # fs = gridfs.GridFS(db, namespace)

            # cursor to find all existing clusters
            cursor = db.clusters.find(
                {"session" : session_id}, 
                projection = {'_id': 1, 'teleoscope': 1},
            )    

            # tidy up all existing clusters
            for cluster in tqdm.tqdm(cursor):

                # NOTE - teleoscopes are no longer auto generated per group. much of below is now redundant. 
                #        leaving for now b/c the trick below to remove teleoscope.chunks & .files was kinda tricky

                # # cluster teleoscope
                # teleo_oid = cluster["teleoscope"]
                # teleo = db.teleoscopes.find_one({"_id": teleo_oid}) 

                # # remove cluster teleoscope from session's teleoscope list
                # teleoscopes.remove(teleo_oid)

                # # associated teleoscope.files
                # teleo_file = teleo["history"][0]["ranked_document_ids"]

                # # delete telescopes.chunks and teleoscopes.files
                # fs.delete(teleo_file)

                # # delete teleoscope 
                # db.teleoscopes.delete_one({"_id": teleo_oid})

                # delete cluster
                db.clusters.delete_one({"_id": cluster["_id"]})
            
            # reset session's association to previous clustering
            history_item["clusters"] = []

            # history_item["teleoscopes"] = teleoscopes # teleoscopes no longer auto generated
            
            db.sessions.update_one(
                {"_id": session_id}, 
                {
                    '$push': {
                        "history": {
                            '$each': [history_item],
                            '$position': 0
                        }
                    }
                },
            )  
        
        logging.info(f'No clusters for user. Ready to populate.')

        pass

    def session_action(self, total_time):
        """Clustering action history update

        Push an update to the session object to document the state of clustering 

        Args:
            total_time:
                time taken for task to complete
        """

        logging.info(f'Clustering action history update.')
        transaction_session, db = utils.create_transaction_session(db=self.dbstring)
        session_id = ObjectId(str(self.session_id))
        session = db.sessions.find_one({"_id": session_id}, {"history": { "$slice": 1}})  

        history_item = session["history"][0]
        history_item["timestamp"] = datetime.datetime.utcnow()
        
        num_clusters = max(self.hdbscan_labels) + 2 # largest group label + outlier group (-1) + first group (0)
        copy = f"Built {num_clusters} clusters in %.2f seconds" % total_time
        history_item["action"] = copy

        # record the groups and their associated documents used for clustering
        history_item["clustered_groups"] = []
        for group in self.groups:

            # documents used for clustering are denoting using the length of the groups history item.
            # the index of said documents are at [current history length - denoted history length]
            history_item["clustered_groups"].append({
                "group_id": group["_id"],
                "position": len(group["history"])
            })

        with transaction_session.start_transaction():
            db.sessions.update_one({"_id": session_id},
                {
                    '$push': {
                        "history": {
                            "$each": [history_item],
                            "$position": 0
                        }
                    }
                }, session=transaction_session)
            utils.commit_with_retry(transaction_session)

        return 200 