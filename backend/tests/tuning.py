# boilerplate
import json
import numpy as np
import logging
from bson.objectid import ObjectId
from pymongo import database
from random_object_id import generate
import random
import matplotlib.pyplot as plt

# ml dependencies
import umap
import hdbscan
from sklearn.metrics.pairwise import euclidean_distances, cosine_distances
import spacy

# local files
from .. import utils
from .. import tasks
from .. import auth
from .. import schemas
from .. import graph

class Tuning:
    """Semi-supervised Clustering 

    The purpose of this class is to cluster a corpus--limited to a subset defined 
    by the limit param plus the documents in the provided human clusters/groups.
    """

    def __init__(
            self, 
            db: database.Database, 
            sources, 
            controls, 
            limit=5000, 
            ordering="random", 
            topic_label_length=2):

        self.db = db
        self.sources = sources
        self.controls = controls
        self.n = limit
        self.topic_label_length = topic_label_length
        self.ordering = ordering
        self.group_doc_indices = None
        self.groups = []

        # large lists (number of examples)
        self.nlp = spacy.load("en_core_web_sm")
        self.document_ids = None    
        self.hdbscan_labels = None
        self.doclists = []
        self.user_groups = []
        self.doc_groups = []

    def tuning(self):
        """Cluster documents using user-defined groups.
        """

        # build distance matrix, run dimensionality reduction, run clustering
        self.learn_clusters()

    def tune_n_components(self, dm):

        n_components = range(1,50,1) # 10
        n_neighbors = 11
        min_dist = 1e-4
        min_cluster_size = 7
        min_samples = 3
        cluster_selection_epsilon = .27

        parameter_values = n_components
        parameter_name = 'n_components'

        num_clusters_list = []
        for val in parameter_values:

            umap_embeddings = umap.UMAP(
                metric = "precomputed", # use distance matrix
                n_components = val,      # reduce to n_components dimensions (2~100)
                n_neighbors = n_neighbors,     # local (small n ~2) vs. global (large n ~100) structure 
                min_dist = min_dist,        # minimum distance apart that points are allowed (0.0~0.99)
            ).fit_transform(dm)
            
            self.hdbscan_labels = hdbscan.HDBSCAN(
                min_cluster_size = min_cluster_size,              # num of neighbors needed to be considered a cluster (0~50, df=5)
                min_samples = min_samples,                  # how conservative clustering will be, larger is more conservative (more outliers) (df=None)
                cluster_selection_epsilon = cluster_selection_epsilon,    # have large clusters in dense regions while leaving smaller clusters small
                                                                        # merge clusters if inter cluster distance is less than thres (df=0)
            ).fit_predict(umap_embeddings)

            num_clusters = len(set(self.hdbscan_labels))
            num_clusters_list.append(num_clusters)

        plt.plot(parameter_values, num_clusters_list, marker='o')
        plt.xlabel(parameter_name)
        plt.ylabel('Number of Clusters')
        title = f'Number of Clusters vs. {parameter_name}'
        plt.title(f'Number of Clusters vs. {parameter_name}')
        plt.grid(True)
        plt.savefig(f'/figs/{title}.png')
        plt.show()

    def tune_n_neighbors(self, dm):

        n_components = 10
        n_neighbors = range(2,50,2) #11
        min_dist = 1e-4
        min_cluster_size = 7
        min_samples = 3
        cluster_selection_epsilon = .27

        parameter_values = n_neighbors
        parameter_name = 'n_neighbors'

        num_clusters_list = []
        for val in parameter_values:

            umap_embeddings = umap.UMAP(
                metric = "precomputed", # use distance matrix
                n_components = n_components,      # reduce to n_components dimensions (2~100)
                n_neighbors = val,     # local (small n ~2) vs. global (large n ~100) structure 
                min_dist = min_dist,        # minimum distance apart that points are allowed (0.0~0.99)
            ).fit_transform(dm)
            
            self.hdbscan_labels = hdbscan.HDBSCAN(
                min_cluster_size = min_cluster_size,              # num of neighbors needed to be considered a cluster (0~50, df=5)
                min_samples = min_samples,                  # how conservative clustering will be, larger is more conservative (more outliers) (df=None)
                cluster_selection_epsilon = cluster_selection_epsilon,    # have large clusters in dense regions while leaving smaller clusters small
                                                                        # merge clusters if inter cluster distance is less than thres (df=0)
            ).fit_predict(umap_embeddings)

            num_clusters = len(set(self.hdbscan_labels))
            num_clusters_list.append(num_clusters)

        plt.plot(parameter_values, num_clusters_list, marker='o')
        plt.xlabel(parameter_name)
        plt.ylabel('Number of Clusters')
        title = f'Number of Clusters vs. {parameter_name}'
        plt.title(f'Number of Clusters vs. {parameter_name}')
        plt.grid(True)
        plt.savefig(f'/figs/{title}.png')
        plt.show()

    def tune_min_dist(self, dm):

        n_components = 10
        n_neighbors = 11
        min_dist = list(np.linspace(1e-5,1e-3,30)) # 1e-4
        min_cluster_size = 7
        min_samples = 3
        cluster_selection_epsilon = .27

        parameter_values = min_dist
        parameter_name = 'min_dist'

        num_clusters_list = []
        for val in parameter_values:

            umap_embeddings = umap.UMAP(
                metric = "precomputed", # use distance matrix
                n_components = n_components,      # reduce to n_components dimensions (2~100)
                n_neighbors = n_neighbors,     # local (small n ~2) vs. global (large n ~100) structure 
                min_dist = val,        # minimum distance apart that points are allowed (0.0~0.99)
            ).fit_transform(dm)
            
            self.hdbscan_labels = hdbscan.HDBSCAN(
                min_cluster_size = min_cluster_size,              # num of neighbors needed to be considered a cluster (0~50, df=5)
                min_samples = min_samples,                  # how conservative clustering will be, larger is more conservative (more outliers) (df=None)
                cluster_selection_epsilon = cluster_selection_epsilon,    # have large clusters in dense regions while leaving smaller clusters small
                                                                        # merge clusters if inter cluster distance is less than thres (df=0)
            ).fit_predict(umap_embeddings)

            num_clusters = len(set(self.hdbscan_labels))
            num_clusters_list.append(num_clusters)

        plt.plot(parameter_values, num_clusters_list, marker='o')
        plt.xlabel(parameter_name)
        plt.ylabel('Number of Clusters')
        title = f'Number of Clusters vs. {parameter_name}'
        plt.title(f'Number of Clusters vs. {parameter_name}')
        plt.grid(True)
        plt.savefig(f'/figs/{title}.png')
        plt.show()
    
    def tune_min_cluster_size(self, dm):

        n_components = 10
        n_neighbors =  11
        min_dist = 1e-4
        min_cluster_size = range(2,50,2) #7
        min_samples = 3
        cluster_selection_epsilon = .27

        parameter_values = min_cluster_size
        parameter_name = 'min_cluster_size'

        num_clusters_list = []
        for val in parameter_values:

            umap_embeddings = umap.UMAP(
                metric = "precomputed", # use distance matrix
                n_components = n_components,      # reduce to n_components dimensions (2~100)
                n_neighbors = n_neighbors,     # local (small n ~2) vs. global (large n ~100) structure 
                min_dist = min_dist,        # minimum distance apart that points are allowed (0.0~0.99)
            ).fit_transform(dm)
            
            self.hdbscan_labels = hdbscan.HDBSCAN(
                min_cluster_size = val,              # num of neighbors needed to be considered a cluster (0~50, df=5)
                min_samples = min_samples,                  # how conservative clustering will be, larger is more conservative (more outliers) (df=None)
                cluster_selection_epsilon = cluster_selection_epsilon,    # have large clusters in dense regions while leaving smaller clusters small
                                                                        # merge clusters if inter cluster distance is less than thres (df=0)
            ).fit_predict(umap_embeddings)

            num_clusters = len(set(self.hdbscan_labels))
            num_clusters_list.append(num_clusters)

        plt.plot(parameter_values, num_clusters_list, marker='o')
        plt.xlabel(parameter_name)
        plt.ylabel('Number of Clusters')
        title = f'Number of Clusters vs. {parameter_name}'
        plt.title(f'Number of Clusters vs. {parameter_name}')
        plt.grid(True)
        plt.savefig(f'/figs/{title}.png')
        plt.show()

    def tune_min_samples(self, dm):

        n_components = 10
        n_neighbors =  11
        min_dist = 1e-4
        min_cluster_size = 7
        min_samples = range(1,50,1) #3
        cluster_selection_epsilon = .27

        parameter_values = min_samples
        parameter_name = 'min_samples'

        num_clusters_list = []
        for val in parameter_values:

            umap_embeddings = umap.UMAP(
                metric = "precomputed", # use distance matrix
                n_components = n_components,      # reduce to n_components dimensions (2~100)
                n_neighbors = n_neighbors,     # local (small n ~2) vs. global (large n ~100) structure 
                min_dist = min_dist,        # minimum distance apart that points are allowed (0.0~0.99)
            ).fit_transform(dm)
            
            self.hdbscan_labels = hdbscan.HDBSCAN(
                min_cluster_size = min_cluster_size,              # num of neighbors needed to be considered a cluster (0~50, df=5)
                min_samples = val,                  # how conservative clustering will be, larger is more conservative (more outliers) (df=None)
                cluster_selection_epsilon = cluster_selection_epsilon,    # have large clusters in dense regions while leaving smaller clusters small
                                                                        # merge clusters if inter cluster distance is less than thres (df=0)
            ).fit_predict(umap_embeddings)

            num_clusters = len(set(self.hdbscan_labels))
            num_clusters_list.append(num_clusters)

        plt.plot(parameter_values, num_clusters_list, marker='o')
        plt.xlabel(parameter_name)
        plt.ylabel('Number of Clusters')
        title = f'Number of Clusters vs. {parameter_name}'
        plt.title(f'Number of Clusters vs. {parameter_name}')
        plt.grid(True)
        plt.savefig(f'/figs/{title}.png')
        plt.show()

    def tune_cluster_selection_epsilon(self, dm):

        n_components = 10
        n_neighbors =  11
        min_dist = 1e-4
        min_cluster_size = 7
        min_samples = 3
        cluster_selection_epsilon = [0.1, 0.1206896551724138, 0.1413793103448276, 0.16206896551724137, 0.18275862068965518, 0.20344827586206898, 0.22413793103448276, 0.24482758620689657, 0.2655172413793103, 0.28620689655172415, 0.30689655172413793, 0.3275862068965517, 0.34827586206896555, 0.36896551724137927, 0.3896551724137931, 0.41034482758620694, 0.43103448275862066, 0.4517241379310345, 0.4724137931034482, 0.49310344827586206, 0.5137931034482759, 0.5344827586206896, 0.5551724137931034, 0.5758620689655173, 0.596551724137931, 0.6172413793103448, 0.6379310344827586, 0.6586206896551724, 0.6793103448275862, 0.7]#.27

        parameter_values = cluster_selection_epsilon
        parameter_name = 'cluster_selection_epsilon'

        num_clusters_list = []
        for val in parameter_values:

            umap_embeddings = umap.UMAP(
                metric = "precomputed", # use distance matrix
                n_components = n_components,      # reduce to n_components dimensions (2~100)
                n_neighbors = n_neighbors,     # local (small n ~2) vs. global (large n ~100) structure 
                min_dist = min_dist,        # minimum distance apart that points are allowed (0.0~0.99)
            ).fit_transform(dm)
            
            self.hdbscan_labels = hdbscan.HDBSCAN(
                min_cluster_size = min_cluster_size,              # num of neighbors needed to be considered a cluster (0~50, df=5)
                min_samples = min_samples,                  # how conservative clustering will be, larger is more conservative (more outliers) (df=None)
                cluster_selection_epsilon = val,    # have large clusters in dense regions while leaving smaller clusters small
                                                                        # merge clusters if inter cluster distance is less than thres (df=0)
            ).fit_predict(umap_embeddings)

            num_clusters = len(set(self.hdbscan_labels))
            num_clusters_list.append(num_clusters)

        plt.plot(parameter_values, num_clusters_list, marker='o')
        plt.xlabel(parameter_name)
        plt.ylabel('Number of Clusters')
        title = f'Number of Clusters vs. {parameter_name}'
        plt.title(f'Number of Clusters vs. {parameter_name}')
        plt.grid(True)
        plt.savefig(f'/figs/{title}.png')
        plt.show()


    def learn_clusters(self):
        """ Learn cluster labels: build distance matrix, run dimensionality reduction, run clustering
        """

        # build training set
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
        # self.tune_min_dist(dm)

        # self.tune_n_components(dm)
        # self.tune_n_neighbors(dm)
        # self.tune_min_cluster_size(dm)
        self.tune_min_samples(dm)
        # self.tune_cluster_selection_epsilon(dm)

    def document_ordering(self):
        """ Build a training set besed on the average of groups' document vectors

        Returns:
            dm:
                a diagonal matrix containing where elements are distances between documents
        """

        for c in self.controls:
            match c["type"]:
                case "Document":
                    # create temp group
                    obj = schemas.create_group_object(
                        "#FF0000", 
                        [c["id"]], 
                        "Your Document", 
                        "Initialize group", 
                        ObjectId(generate()), # random id
                        "Group from Document",
                        ObjectId(generate()), # random id
                    )
                    # Initialize group in database
                    res = self.db.groups.insert_one(obj)
                    oid = res.inserted_id
                    group = self.db.groups.find_one({"_id": oid})
                    self.doc_groups.append(oid)
                    self.groups.append(group)

                case "Group":
                    group = self.db.groups.find_one({"_id": c["id"]})
                    self.groups.append(group)
                case "Search":
                    pass
                case "Note":
                    pass

        logging.info("Gathering all document vectors from embeddings...")
        # grab all document data from embeddings
        all_doc_ids, all_doc_vecs = utils.get_documents(self.db.name)
        if len(all_doc_ids) < self.n:
            self.n = len(all_doc_ids)

        # if sources = 0: average ordering of conrolls for all[30000]
        logging.info('Gathering Document IDs...')

        if len(self.sources) == 0:
            
            logging.info(f"n = {self.n}")

            if self.ordering == "average":
                logging.info('No sources. Using average ordering...')
                
                # build a list of ids of documents in all groups 
                docs = []
                for group in self.groups:
                    group_document_ids = group["history"][0]["included_documents"]
                    docs += group_document_ids
                
                # get control vectors
                control_vecs = [all_doc_vecs[all_doc_ids.index(oid)] for oid in docs]
                source_vecs = np.array(all_doc_vecs)
                ranks = graph.rank(control_vecs, all_doc_ids, source_vecs, self.n)
                document_ids = [i for i,s in ranks] 
            
            if self.ordering == "random":
                logging.info('No sources. Using random ordering...')
                random.seed(47)
                document_ids = random.sample(all_doc_ids, self.n)

        else:
            # if sources > 0: sources U controls 
            logging.info(f'{len(self.sources)} sources. Combining docs from sources...')

            document_ids = []
            full_search_input = False # check to disallow more than one full search input

            for source in self.sources:
                match source["type"]:
                    case "Document":
                        document_ids.append(source["id"])

                    case "Group":
                        group = self.db.groups.find_one({"_id": source["id"]})
                        docs =  group["history"][0]["included_documents"]
                        document_ids += [ObjectId(str(id)) for id in docs]

                    case "Search":
                        search = self.db.searches.find_one({"_id": source["id"]})
                        query = search["history"][0]["query"]
                        
                        if query != "":
                            cursor = self.db.documents.find(utils.make_query(query),projection={ "_id": 1}).limit(self.n)
                            document_ids += [d["_id"] for d in list(cursor)]
                        elif query == "" and full_search_input is False:
                            document_ids += random.sample(all_doc_ids, self.n)
                            full_search_input = True

                    case "Note":
                        pass
            
            # remove duplicate ids
            document_ids = list(set(document_ids))
            self.n = len(document_ids)
            logging.info(f"n = {self.n}")

 
        # Create a dictionary to store the indices of all_doc_ids
        index_dict = {all_doc_ids[i]: i for i in range(len(all_doc_ids))}

        # Get the indices of document_ids using the dictionary
        indices = [index_dict[i] for i in document_ids]

        logging.info('Gathering Document Vectors...')
        # use indices of ranked ids to build sorted array of document vectors
        document_vectors = np.array([all_doc_vecs[i] for i in indices])
        # dict where keys are group names and values are indices of documents
        group_doc_indices = {}
        
        # make sure documents in groups are included in training sets
        logging.info("Appending documents from input groups...")
        for group in self.groups:

            group_document_ids = group["history"][0]["included_documents"]

            indices = []

            for str_id in group_document_ids:

                # see if document is already in training sets
                try:
                    id = ObjectId(str(str_id))
                    document_ids.index(id)

                # if not add document to training sets
                except:
                    document = self.db.documents.find_one(
                        {"_id": id},
                        projection={'textVector': 1},
                    )
                    if not document: raise Exception(f"Document {str(id)} not found")
                    document_ids.append(id)
                    vector = np.array(document["textVector"]).reshape((1, 512))
                    document_vectors = np.append(document_vectors, vector, axis=0)

                # get index of document in group with respect to training sets
                finally:
                    indices.append(document_ids.index(id))

            group_doc_indices[group["history"][0]["label"]] = indices

        # build distance matrix
        logging.info("Building distance matrix...")
        dm = cosine_distances(document_vectors)
        logging.info(f"Distance matrix has shape {dm.shape}.") # n-by-n symmetrical matrix

        # update distance matrix such that documents in the same group have distance ~0
        INTRA_CLUSTER_DISTANCE = 1e-2
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

