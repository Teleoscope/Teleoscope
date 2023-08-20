# boilerplate
import json
import numpy as np
import logging
from bson.objectid import ObjectId
from pymongo import database
from random_object_id import generate
import random
import matplotlib.pyplot as plt
from tqdm import tqdm
import warnings
# ml dependencies
import umap
import hdbscan
from sklearn.metrics.pairwise import euclidean_distances, cosine_distances
import spacy
import pandas as pd

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
            limit=15000):

        self.db = db
        self.sources = sources
        self.controls = controls
        self.n = limit
        self.ordering = None
        self.separation = None
        self.group_doc_indices = None
        self.groups = []

        # large lists (number of examples)
        self.document_ids = None    
        self.hdbscan_labels = None
        self.doclists = []
        self.user_groups = []
        self.doc_groups = []

    def tuning(self):
        """        
        for [1 group, 3 groups, 5 groups]: # or just always use n groups
            for [random ordering, average ordering]:
                for [separate, not separate]:
                    for [UMAP 1]:
                        for [UMAP 2]:
                            for [UMAP 3]:
                                for [HDBSCAN 1]:
                                    for [HDBSCAN 2]:
                                        for [HDBSCAN 3]:
                                            # compute a bunch of metrics
        """

        # prep feature space
        # n = 15000
        results = []  # List to store results

        """"
        TODO 
            - use default UMAP with n_comp=2
            - increase epoch for HDBSCAN around the defaults
            - plot results
            - compute statistics for inter/intracluster distance
            - add existing stats
        """
        try:
            for ordering in tqdm(["random", "average"], desc="Ordering", leave=False):
                self.ordering = ordering
                for separation in tqdm([True, False], desc="Separation", leave=False):
                    self.separation = separation
                    logging.info(f'Preparing data with {ordering} ordering and separation {separation}')
                    dm = self.document_ordering()
                    
                    nc_vals = range(1,50,1)
                    for n_components in tqdm([5, 20], desc="n_components", leave=False): 
                        
                        nn_vals = range(2,50,2)
                        for n_neighbors in tqdm([5, 20], desc="n_neighbors", leave=False):
                            
                            md_vals = list(np.linspace(0.0,0.2,30))
                            for min_dist in tqdm([0.5, 0.15], desc="min_dist", leave=False): 
                                
                                warnings.filterwarnings("ignore")
                                umap_embeddings = umap.UMAP(
                                    metric = "precomputed", # use distance matrix
                                    n_components = n_components,
                                    n_neighbors =  n_neighbors,
                                    min_dist = min_dist,       
                                ).fit_transform(dm)
                                
                                #  compute intercluster and intracluster distances

                                mcs_vals = range(2,50,2)
                                for min_cluster_size in tqdm([5, 20], desc="min_cluster_size", leave=False): 
                                    
                                    ms_vals = range(1,50,1)
                                    for min_samples in tqdm([5, 20], desc="min_samples", leave=False): 
                                        
                                        eps_vals = [0.2,0.5] # np.linspace(0.1,0.7,30)
                                        for cluster_selection_epsilon in tqdm(eps_vals, desc="cluster_selection_epsilon", leave=False): 
                                            
                                            hdbscan_labels = hdbscan.HDBSCAN(
                                                min_cluster_size = min_cluster_size,           
                                                min_samples = min_samples,                  
                                                cluster_selection_epsilon = cluster_selection_epsilon,  
                                            ).fit_predict(umap_embeddings)
                                            
                                            # Perform desired calculations
                                            num_clusters = len(np.unique(hdbscan_labels))

                                            values = {
                                                "ordering": ordering,
                                                "separation": separation,
                                                "n_components": n_components,
                                                "n_neighbors": n_neighbors,
                                                "min_dist": min_dist,
                                                "min_cluster_size": min_cluster_size,
                                                "min_samples": min_samples,
                                                "cluster_selection_epsilon": cluster_selection_epsilon,
                                                "total_num_clusters": num_clusters,
                                            }
                                                
                                            hdbscan_labels = np.where(hdbscan_labels == -1, num_clusters+1, hdbscan_labels)
                                            counts = np.bincount(hdbscan_labels)
                                            values["median_cluster_density"] = np.median(counts)
                                            
                                            for group in self.group_doc_indices:
                                                
                                                # list of labels given to docs in group
                                                labels = hdbscan_labels[self.group_doc_indices[group]] 
                                                # get non -1 label (if exists)
                                                correct_label = -1 if len(labels) == 0 else max(labels)
                                                count_of_label = np.count_nonzero(hdbscan_labels == correct_label)
                                                values[f"size_of_{group}"] = count_of_label
                                            
                                            values["size_of_largest_cluster"] = np.max(counts)

                                            # Append the results to the list
                                            results.append(values)

        
        except:
            logging.info("errord")
            
        # Create a DataFrame from the list of results
        results_df = pd.DataFrame(results)

        # Write the DataFrame to a CSV file
        results_df.to_csv("results.csv", index=False)

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

        # grab all document data from embeddings
        all_doc_ids, all_doc_vecs = utils.get_documents(self.db.name)
        if len(all_doc_ids) < self.n:
            self.n = len(all_doc_ids)

        # if sources = 0: average ordering of conrolls for all[30000]

        if len(self.sources) == 0:
            

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

 
        # Create a dictionary to store the indices of all_doc_ids
        index_dict = {all_doc_ids[i]: i for i in range(len(all_doc_ids))}

        # Get the indices of document_ids using the dictionary
        indices = [index_dict[i] for i in document_ids]

        # use indices of ranked ids to build sorted array of document vectors
        document_vectors = np.array([all_doc_vecs[i] for i in indices])
        # dict where keys are group names and values are indices of documents
        group_doc_indices = {}
        
        # make sure documents in groups are included in training sets
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
        dm = cosine_distances(document_vectors)

        # update distance matrix such that documents in the same group have distance ~0
        INTRA_CLUSTER_DISTANCE = 1e-3

        for group, indices in group_doc_indices.items():
            for i in indices:
                dm[i, indices] *= INTRA_CLUSTER_DISTANCE

        if self.separation:
            # update distance matrix such that documents in the differnet groups have distance 1
            logging.info("Separating control groups...")

            INTER_CLUSTER_DISTANCE = 1

            for group_i, indices_i in group_doc_indices.items():
                for group_j, indices_j in group_doc_indices.items():
                    if group_i != group_j:
                        for i in indices_i:
                            for j in indices_j:
                                dm[i, j] = INTER_CLUSTER_DISTANCE

        self.group_doc_indices = group_doc_indices
        self.document_ids = document_ids

        return dm

if __name__ == '__main__':

    """ RUN FROM CL AS MODULE > python -m backend.tests.tuning """

    db = utils.connect(db="nursing")
    
    sources = []
    controls = []
    ids = [
        "6452ffcaa192f6224493e419", # race/culture
        "6488b6ebde56ae65c7cfe67e", # 2SLGBTQ+ 
        "6452ffe1a192f6224493e41f", # vulnerable
        # "64545bf9ae13c83727e4fb4a", # disabilities
        # "6452ffd6a192f6224493e41d", # mental health
    ]

    for id in ids:
        group = db.groups.find_one({"_id": ObjectId(str(id))})
        edge = schemas.create_edge(group["_id"], group["_id"], "Group")
        controls.append(edge)

    project = Tuning(db, sources, controls)
    project.tuning()
