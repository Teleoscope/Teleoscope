# boilerplate
import numpy as np
import logging
from bson.objectid import ObjectId
from pymongo import database
from random_object_id import generate
import random
from itertools import groupby

# ml dependencies
import umap
import hdbscan
from sklearn.metrics.pairwise import euclidean_distances, cosine_distances
import spacy

# local files
from . import utils
from . import embeddings

class Projection:
    """Semi-supervised Clustering 

    The purpose of this class is to cluster a corpus--limited to a subset defined 
    by the limit param plus the documents in the provided human clusters/groups.
    """

    ##########################################################################
    # 0.0 Class is initialized
    ##########################################################################
    def __init__(
            self, 
            db: database.Database, 
            sources, 
            controls, 
            projection_id,
            ordering, 
            separation,
            limit=20000,
            topic_label_length=2):
        """Initializes the instance 

        Args:
            sources:
                list of source inputs: group, document, search, note 
            controls:
                list of control inputs: group, document, search, note 
            limit:
                Limits the size of n
            ordering:
                Metric for subsetting feature space
                    random: random subset
                    average: ranked ordering w/ respect to average vector of labelled documents
            topic_label_length:
                Minimum number of words to use for machine cluster topic labels. Default 2
        """


        self.db = db
        self.sources = sources
        self.controls = controls
        self.n = limit
        self.topic_label_length = topic_label_length
        self.ordering = ordering
        self.separation = separation
        self.groups = []
        self.pid = ObjectId(str(projection_id))

        # large lists (number of examples)
        self.nlp = spacy.load("en_core_web_sm")
        self.document_ids = None    
        self.hdbscan_labels = None
        self.doclists = []
        self.user_groups = []
        self.doc_groups = []


    ##########################################################################
    # 1. Learn and build starts here
    ##########################################################################
    def clustering_task(self):
        """Cluster documents using user-defined groups.
        """

        # Build distance matrix, run dimensionality reduction, run clustering
        try:
            self.learn_clusters()
        except Exception as e:
            self.log("Failure to learn clusters. Try again.")
            raise e

        # Iteratively add clusters (as groups) to database
        try:
            self.build_clusters()
        except Exception as e:
            self.log("Failure to build clusters. Try again.")
            raise e

        # append updated user groups to head
        self.doclists = self.user_groups + self.doclists

        return self.doclists


    def log(self, message):
        self.db.graph.update_one({"_id": self.pid}, { "$set": { "status": message} })

    ##########################################################################
    # 2. Learn clusters
    ##########################################################################
    def learn_clusters(self):
        """ Learn cluster labels: 
            2.1. Build distance matrix
            2.2. Run dimensionality reduction
            2.3. Run clustering
        """

        # 2.1 Create a square distance matrix for each document vector
        #     where documents that are grouped together have min distance
        #     and documents not grouped together optionally have max distance
        self.log("processing source input... (1/4)")
        dm = self.document_ordering()

        """
            best params from march:
            n_components = 30, min_dist = 1e-5, min_cluster_size = 10, cluster_selection_epsilon = 0.2

            notes from turning:
                - dont hit thresh. if min_cluster_size > 7-8
                - increase min samples, increase clusters
                - increase epsilon, decrease clusters
                - large n_components requires larger n_neighbors
                - increasing n_neighbors, decreases clusters
                - n_components greater than 10 are much the same, less than 10 are bad.
                - 11 was most frequent nn for thresh.
                - https://maartengr.github.io/BERTopic/getting_started/parameter%20tuning/parametertuning.html#umap
        """

        # 2.2 Project down the rest of the space based on the distance matrix
        n_components = random.randint(7, 12) #7
        n_neighbors = random.randint(5, 15) #15 
        min_dist = random.uniform(1e-4, 0.05) # 0.029184 # 1e-4

        logging.info("Running UMAP Reduction...")
        self.log("projecting control input... (2/4)")
        
        umap_embeddings = umap.UMAP(
            metric = "precomputed", # use distance matrix
            n_components=n_components,
            n_neighbors=n_neighbors,
            min_dist=min_dist
        ).fit_transform(dm)
        
        # 2.3 Cluster based on the projected vectors
        self.log("clustering... (3/4)")

        logging.info("Running HDBSCAN clustering...")
        logging.info('---------------------------------------')
        logging.info('{:<7s}{:<10s}'.format('Epoch','Num. Clusters'))
        logging.info('---------------------------------------')

        i, num_clust, max_epochs = 0, 0, 10
        min_cluster_size, min_samples, cluster_selection_epsilon = 0, 0, 0.0

        while (num_clust < 10 or num_clust > 100):
        
            min_cluster_size = 20#random.randint(10, 15) #11
            min_samples = 15 #random.randint(10, 15)#12
            cluster_selection_epsilon = 0.1 #random.uniform(0.26, 0.29) #0.270212
                
            self.hdbscan_labels = hdbscan.HDBSCAN(
                min_cluster_size = min_cluster_size,              # num of neighbors needed to be considered a cluster (0~50, df=5)
                min_samples = min_samples,                  # how conservative clustering will be, larger is more conservative (more outliers) (df=None)
                cluster_selection_epsilon = cluster_selection_epsilon,    # have large clusters in dense regions while leaving smaller clusters small
                                                                        # merge clusters if inter cluster distance is less than thres (df=0)
            ).fit_predict(umap_embeddings)

            num_clust = len(set(self.hdbscan_labels))
            i+=1 #epoch

            logging.info('{:<7d}{:<10d}'.format(i,num_clust))

            if i == max_epochs: break
        
        logging.info('---------umap-hyperparameters----------')
        logging.info('{:<28s}{:<5d}'.format('n_components:',n_components))
        logging.info('{:<28s}{:<5d}'.format('n_neighbors:',n_neighbors))
        logging.info('{:<28s}{:<5f}'.format('min_dist:',min_dist))
        logging.info('--------hdbscan-hyperparameters--------')
        logging.info('{:<28s}{:<5d}'.format('min_cluster_size:',min_cluster_size))
        logging.info('{:<28s}{:<5d}'.format('min_samples:',min_samples))
        logging.info('{:<28s}{:<3f}'.format('cluster_selection_epsilon:',cluster_selection_epsilon))

        logging.info('---------------results-----------------')
        logging.info('{:<28s}{:<5d}'.format('number of clusters:',len(set(self.hdbscan_labels))))


    def build_clusters(self):
        """ Iteratively builds groups in mongoDB relative to clustering
        """

        self.log("labelling clusters... (4/4)")

        # keep track of all topic labels (for collisions)
        topic_labels = []
      
        logging.info('---------------------------------------')
        logging.info('{:<20s}{:<4s}'.format('Label','Num. Docs'))
        logging.info('---------------------------------------')

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
            
        
            limit = min(20, len(label_ids))
            _label, _description = self.get_topic(label_ids[:limit], topic_labels)
            topic_labels.append(_label)

            # logging.info(f'Cluster: "{_label}" has {len(documents)} documents')
            logging.info('{:<20s}{:<4d}'.format(_label,len(documents)))
            
            self.add_cluster(documents, _label, utils.random_color(), _description)
    

    def document_ordering(self):
        """ Build a training set besed on the average of groups' document vectors

        Returns:
            dm:
                a diagonal matrix containing where elements are distances between documents
        """        
        # Get unique document ids
        # document_ids = list(set(utils.get_doc_oids(self.db, self.sources, exclude=["Note"])))
        client = embeddings.connect()

        source_oid_set = set()
        for source in self.sources:
            for doclist in source["doclists"]:
                oids = [r[0] for r in doclist["ranked_documents"]]
                source_oid_set.update(oids)
        source_oids = list(source_oid_set)
        source_embeddings = embeddings.get_embeddings(client, self.db.name, source_oids)
        source_vectors = [s["vector"] for s in source_embeddings]
        svs = np.array(source_vectors)
        source_dm = utils.get_distance_matrix(svs, cosine_distances)
        
        control_groupings = []
        control_vectors = []
        for control in self.controls:
            for doclist in control["doclists"]:
                oids = [r[0] for r in doclist["ranked_documents"]]
                embeds = embeddings.get_embeddings(client, self.db.name, oids)
                for result in embeds:
                    control_vectors.append(result["vector"])
                    control_groupings.append(doclist["uid"])
        
        cvs = np.array(control_vectors)
        control_dm = utils.get_distance_matrix(cvs, cosine_distances)
        
        # update distance matrix such that documents in the same group have distance ~0
        INTRA_CLUSTER_DISTANCE = 1e-3
        for i in range(len(control_vectors)):
            for j in range(len(control_vectors)):
                if i != j and control_groupings[i] == control_groupings[j]:
                    control_dm[i, j] *= INTRA_CLUSTER_DISTANCE


        rows_A, cols_A = source_dm.shape
        rows_B, cols_B = control_dm.shape

        # Create a larger matrix
        corner_matrix = np.ones((rows_A + rows_B, cols_A + cols_B))

        # Place matrix A in the top-left corner
        corner_matrix[:rows_A, :cols_A] = source_dm

        # Place matrix B in the bottom-right corner
        corner_matrix[rows_A:, cols_A:] = control_dm

        
        umap_model = umap.UMAP(metric='precomputed')
        embedding = umap_model.fit_transform(corner_matrix)

        hdbscan_clusterer = hdbscan.HDBSCAN(min_cluster_size=2)
        cluster_labels = hdbscan_clusterer.fit_predict(embedding)
        grouped_cluster_labels = [list(group) for key, group in groupby(cluster_labels)]

        doclists = []
        acc = 0
        for label_group in grouped_cluster_labels:
            doclist = {
                "reference": None,
                "uid": None,
                "type": "Cluster",
                "label": label_group[0].item(),
                "ranked_documents": []
            }
            for item in label_group:
                doclist["ranked_documents"].append(
                    [
                        source_oids[acc],
                        1.0
                    ]
                )
                acc += 1
            doclists.append(doclist)
        
        return doclists

        """

        # logging.info("HDBSCAN Results:")
        # logging.info(cluster_labels)
            

        
        # dm = utils.get_distance_matrix(control_vectors, cosine_distances)


 
        # grab all document data from embeddings
        document_embeddings = embeddings.get_embeddings(self.db.name, source_oids)

        # Create a dictionary to store the indices of all_doc_ids
        index_dict = {source_oids[i]: i for i in range(len(source_oids))}

        # use indices of ranked ids to build sorted array of document vectors
        document_vectors = np.array([doc["vector"] for doc in document_embeddings])

        # build distance matrix
        logging.info("Building distance matrix...")
        
        dm = utils.get_distance_matrix(document_vectors, cosine_distances)
        logging.info(f"Distance matrix has shape {dm.shape}.") # n-by-n symmetrical matrix
        logging.info(f"Max distance is {np.max(dm)} and min distance is {np.min(dm)}.")

        

        # build dm indices
        for group in self.controls:
            # figure out the dm matrix indices
            indices = [index_dict[str(doc)] for doc in group["docs"]]
            group["indices"] = indices
        

        # go through each group
        for group in self.groups:
            # go through each index and symmetrically update to minimum distance
            for i in group["indices"]:
                for j in group["indices"]:
                    dm[i, j] *= INTRA_CLUSTER_DISTANCE
                    dm[j, i] *= INTRA_CLUSTER_DISTANCE

        if self.separation:
            # update distance matrix such that documents in the differnet groups have distance 1
            logging.info("Separating control groups...")

            INTER_CLUSTER_DISTANCE = 1
            
            # go through each group to compare against each other group
            for group_i in self.groups:
                for group_j in self.groups:
                    # if we're not comparing the same group
                    if group_i["_id"] != group_j["_id"]:
                        # grab the dm indices of each document in the group
                        i_indices = group_i["indices"]
                        j_indices = group_j["indices"]
                        
                        # set the distance to maximum if the doc is also not in the same group
                        for i in i_indices:
                            for j in j_indices:
                                if i not in j_indices:
                                    dm[i, j] = INTER_CLUSTER_DISTANCE
                                if j not in i_indices:
                                    dm[j, i] = INTER_CLUSTER_DISTANCE

        self.document_ids = document_ids

        return dm

        """


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
        try:
            X = vec.fit_transform(docs_pp)
        except:
            return "generic cluster", "documents only contain stop words"

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
        description = feature_names[sorting[0][0]]
        for i in range(1, min(8, len(sorting[0]))):
            description += " " + feature_names[sorting[0][i]]

        # check for collisions with existing labels; if yes, append another topic label. 
        i = self.topic_label_length
        while(1):
            if label not in topic_labels:
                return label, description
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
    

    def add_cluster(self, documents, label, color, description):
        """
        Adds a cluster to projection
        """

        doclist = {
            "ranked_documents": [(d, 1.0) for d in documents],
            "label": label,
            "color": color,
            "description": description,
            "type": "Cluster"
        }

        if description == "your group":
            self.user_groups.append(doclist)
        else:
            self.doclists.append(doclist)
        
