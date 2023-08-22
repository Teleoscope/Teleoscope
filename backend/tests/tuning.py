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
from pathlib import Path
import traceback

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
            i=0
            for ordering in tqdm(["random", "average"], desc="Ordering", leave=False):
                self.ordering = ordering
                for separation in tqdm([True, False], desc="Separation", leave=False):
                    self.separation = separation
                    logging.info(f'Preparing data with {ordering} ordering and separation {separation}')

                    umap_embedding = self.get_embedding()
                    # self.group_doc_indices = {key: loaded_data[key] for key in loaded_data}

                    # self.group_doc_indices = group_doc_indices
                    mcs_vals = np.around(np.linspace(2,70,15)).astype(int) # default=5
                    ms_vals = [None] + np.around(np.linspace(1, 30, 15)).astype(int).tolist()
                    eps_vals = [0.        , 0.07142857, 0.14285714, 0.21428571, 0.28571429,
       0.35714286, 0.42857143, 0.5       , 0.57142857, 0.64285714,
       0.71428571, 0.78571429, 0.85714286, 0.92857143, 1.        ] # default=0.0

                    for min_cluster_size in tqdm(mcs_vals, desc="min_cluster_size", leave=False): 
                        for min_samples in tqdm(ms_vals, desc="min_samples", leave=False): 
                            for cluster_selection_epsilon in tqdm(eps_vals, desc="cluster_selection_epsilon", leave=False): 
                                
                                hdbscan_labels = hdbscan.HDBSCAN(
                                    min_cluster_size = min_cluster_size,           
                                    min_samples = min_samples,                  
                                    cluster_selection_epsilon = cluster_selection_epsilon,  
                                ).fit_predict(umap_embedding)
                                
                                # variable stats
                                values = {
                                    "ordering": ordering,
                                    "separation": separation,
                                    "min_cluster_size": min_cluster_size,
                                    "min_samples": min_samples,
                                    "cluster_selection_epsilon": cluster_selection_epsilon
                                }

                                if min_samples is None: values["min_samples"] = "None"
                                
                                # inter/intra cluster dist stats
                                umap_dm = cosine_distances(umap_embedding)
                                intra_cluster_distances = []
                                group_centroids = []
                                for group, indices in self.group_doc_indices.items():

                                    # Calculate intra-cluster distances for the current group
                                    intra_distances = umap_dm[indices][:, indices]
                                    intra_cluster_distances.extend(intra_distances.ravel())  # Append all intra-distances

                                    # get centroid for this group
                                    group_vectors = umap_embedding[indices]  # Get vectors for the current group
                                    group_centroid = np.mean(group_vectors, axis=0)  # Calculate the centroid
                                    group_centroids.append(group_centroid)
                                
                                inter_dm = cosine_distances(group_centroids)
                                inter_cluster_distances = inter_dm[np.triu_indices(len(inter_dm), k=1)]

                                intra_array = np.array(intra_cluster_distances)
                                values["intra_min"] = np.min(intra_array)
                                values["intra_max"] = np.max(intra_array)
                                values["intra_mean"] = np.mean(intra_array)
                                values["intra_std"] = np.std(intra_array)
                                
                                inter_array = np.array(inter_cluster_distances)
                                values["inter_min"] = np.min(inter_array)
                                values["inter_max"] = np.max(inter_array)
                                values["inter_mean"] = np.mean(inter_array)
                                values["inter_std"] = np.std(inter_array) 

                                del inter_dm, umap_dm, intra_cluster_distances, inter_cluster_distances, intra_array, inter_array

                                # resultant cluster stats
                                num_clusters = len(np.unique(hdbscan_labels))
                                values["total_num_clusters"] = num_clusters

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

                                # Plot clustering 
                                clustered = (hdbscan_labels >= 0)
                                plt.scatter(umap_embedding[~clustered, 0],
                                    umap_embedding[~clustered, 1],
                                    color=(0.5, 0.5, 0.5),
                                    s=0.1,
                                    alpha=0.5)
                                plt.scatter(umap_embedding[clustered, 0],
                                    umap_embedding[clustered, 1],
                                    c=hdbscan_labels[clustered],
                                    s=0.1,
                                    cmap='Spectral')
                                dir = Path(f'~/results/plots').expanduser()
                                dir.mkdir(parents=True, exist_ok=True)
                                plot_path = dir / f"plot_{i}.png"
                                plt.title("UMAP Embedding clustered with HDBSCAN")
                                plt.suptitle(
                                    f"ordering={ordering}, " 
                                    f"separation={separation}, " 
                                    f"min_cluster_size={min_cluster_size}, " 
                                    f"min_samples={min_samples}, " 
                                    f"cluster_selection_epsilon={cluster_selection_epsilon}")
                                plt.savefig(plot_path, dpi=300, bbox_inches="tight")
                                plt.close()  

                                # Append the results to the list
                                results.append(values)
                                i+=1
        
        except:
            # Handle the exception and print the error log
            logging.info(traceback.format_exc())
            
        # Create a DataFrame from the list of results
        results_df = pd.DataFrame(results)

        # Write the DataFrame to a CSV file
        dir = Path(f'~/results/').expanduser()
        dir.mkdir(parents=True, exist_ok=True)
        csvpath = dir / 'stats.csv'
        results_df.to_csv(csvpath, index=False)


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
    
    def get_embedding(self):
        
        # dir = Path(f'~/embeddings/UMAP/').expanduser()
        # dir.mkdir(parents=True, exist_ok=True)
        # npzpath = Path(f'~/embeddings/UMAP/{self.ordering}_{self.separation}.npz').expanduser()

        # if npzpath.exists():
            
        #     loadDocuments = np.load(npzpath.as_posix(), allow_pickle=False)
        #     return loadDocuments['embedding'], loadDocuments['indices'] 

        dm = self.document_ordering()
        warnings.filterwarnings("ignore")
        umap_embedding = umap.UMAP(
            metric = "precomputed", # use distance matrix
            n_components = 2      
        ).fit_transform(dm)
        return umap_embedding
        # np.savez(npzpath.as_posix(), embedding=umap_embedding, indices=group_indices)


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
