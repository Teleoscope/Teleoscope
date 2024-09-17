# projection.py
import numpy as np
from random_object_id import generate
from itertools import groupby
import logging
import os
import joblib

# ML dependencies
import umap
import hdbscan
from sklearn.metrics.pairwise import cosine_distances

# Local files
from backend import embeddings

# Directory where intermediate results will be cached
cache_dir = './hdbscan_cache'
if not os.path.exists(cache_dir):
    os.makedirs(cache_dir)

# Create a joblib memory object
memory = joblib.Memory(location=cache_dir, verbose=0)

def document_ordering(sources, controls, dbname, workspace_id):
    """Build a training set based on the average of groups' document vectors.

    Args:
        sources (list): List of source document data.
        controls (list): List of control document data.
        dbname (str): Database name for embedding retrieval.

    Returns:
        list: A list of document clusters with ranked documents.
    """
    client = embeddings.connect()
    
    # Retrieve embeddings for source documents
    source_oids, source_vectors = retrieve_embeddings(client, dbname, workspace_id, sources)
    source_dm = get_distance_matrix(source_vectors, cosine_distances)

    if len(controls) > 1:
        # Retrieve embeddings for control documents if they exist
        control_groupings, control_vectors, control_oids = retrieve_control_embeddings(client, dbname, workspace_id, controls)
        control_dm = get_distance_matrix(control_vectors, cosine_distances)
        adjust_intra_cluster_distances(control_dm, control_groupings)
        
        # Combine distance matrices
        corner_matrix = combine_distance_matrices(source_dm, control_dm)
        
        # Add control OIDs to the source OIDs list for clustering
        source_oids.extend(control_oids)
    else:
        # If no controls, use only the source distance matrix
        corner_matrix = source_dm

    # Perform dimensionality reduction and clustering
    embedding = umap_reduction(corner_matrix)
    cluster_labels = cluster_documents(embedding)

    # Organize documents into clusters
    doclists = organize_clusters(cluster_labels, source_oids)

    return doclists


def retrieve_embeddings(client, dbname, workspace_id, sources):
    """Retrieve embeddings for source documents."""
    source_oids = []
    for source in sources:
        for doclist in source["doclists"]:
            oids = [r[0] for r in doclist["ranked_documents"]]
            source_oids.extend(oids)
    source_embeddings = embeddings.get_embeddings(client, dbname, workspace_id, source_oids)
    source_vectors = [s["vector"] for s in source_embeddings]
    return source_oids, np.array(source_vectors)


def retrieve_control_embeddings(client, dbname, workspace_id, controls):
    """Retrieve embeddings for control documents."""
    control_groupings = []
    control_vectors = []
    control_oids = []
    for control in controls:
        for doclist in control["doclists"]:
            oids = [r[0] for r in doclist["ranked_documents"]]
            control_oids.extend(oids)
            embeds = embeddings.get_embeddings(client, dbname, workspace_id, oids)
            for result in embeds:
                control_vectors.append(result["vector"])
                control_groupings.append(doclist["uid"])
    return control_groupings, np.array(control_vectors), control_oids


def get_distance_matrix(vectors, distance_func):
    """Calculate the distance matrix for a given set of vectors."""
    return distance_func(vectors)

def adjust_intra_cluster_distances(control_dm, control_groupings):
    """Adjust distances within the same control group to be very small."""
    INTRA_CLUSTER_DISTANCE = 1e-3
    for i in range(len(control_dm)):
        for j in range(len(control_dm)):
            if i != j and control_groupings[i] == control_groupings[j]:
                control_dm[i, j] *= INTRA_CLUSTER_DISTANCE


def combine_distance_matrices(source_dm, control_dm):
    """Combine source and control distance matrices into a larger matrix."""
    rows_A, cols_A = source_dm.shape
    rows_B, cols_B = control_dm.shape
    corner_matrix = np.ones((rows_A + rows_B, cols_A + cols_B))
    corner_matrix[:rows_A, :cols_A] = source_dm
    corner_matrix[rows_A:, cols_A:] = control_dm
    return corner_matrix


def umap_reduction(distance_matrix):
    """Perform UMAP dimensionality reduction."""
    umap_model = umap.UMAP(
        metric='precomputed',
        n_components=2,
        n_neighbors=100, 
        min_dist=0.05,

    )
    return umap_model.fit_transform(distance_matrix)


def cluster_documents(embedding):
    """Cluster documents using HDBSCAN."""
    hdbscan_clusterer = hdbscan.HDBSCAN(
        min_cluster_size=5,
        min_samples=5,
        memory=memory,
    )
    hdbscan_clusterer.fit(embedding)

    for min_cluster_size in [5, 10, 15, 20, 25, 30, 35, 40, 50]:
        logging.info(f"Running HDBSCAN with min cluster size of {min_cluster_size}.")
        hdbscan_clusterer.min_cluster_size = min_cluster_size
        cluster_labels = hdbscan_clusterer.fit_predict(embedding)
        unique_labels = set(cluster_labels)
        logging.info(f"MCS {min_cluster_size} produced {len(unique_labels)} labels.")
        if len(unique_labels) >= 3 and len(unique_labels) < 25:
            return cluster_labels

    return cluster_labels


def organize_clusters(cluster_labels, source_oids):
    """Organize documents into clusters."""
    logging.info(f"There were {len(cluster_labels)} cluster labels.")
    logging.info(f"There were {len(source_oids)} source OIDs.")
    unique_labels = set(cluster_labels)
    label_map = {}
    for label in unique_labels:
        doclist = {
            "reference": None,
            "uid": None,
            "type": "Cluster",
            "label": str(label),
            "ranked_documents": []
        }
        label_map[label] = doclist
    
    for acc, label in enumerate(cluster_labels):
        label_map[label].doclist["ranked_documents"].append([source_oids[acc], 1.0])
    
    doclists = [label_map[label] for label in label_map.values()]

    return doclists
