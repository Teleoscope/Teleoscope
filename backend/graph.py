from bson.objectid import ObjectId
from pymongo import MongoClient, database
from typing import List
import numpy as np
import logging
import bcrypt
import chromadb
from chromadb import Documents, EmbeddingFunction, Embeddings
from chromadb.config import Settings

from . import schemas
from . import utils
from . import projection

# environment variables
from dotenv import load_dotenv
load_dotenv()  # This loads the variables from .env
import os
CHROMA_HOST = os.getenv('CHROMA_HOST') 
CHROMA_PORT = os.getenv('CHROMA_PORT') 


################################################################################
# Graph API
################################################################################

def make_node(db: database.Database, workflow_id: ObjectId, 
        oid: ObjectId, 
        node_type: schemas.NodeType):
    """Make a node in the graph.

    Groups, Documents, and Searches are only sources.
    Operations are sources or targets.

    Every pure source has only one corresponding graph item.
    Every operation can have as many graph items as nodes on graph.
    You can convert any graph item into a group.

    Args:
        oid: The OID for the workspace item.
        node_type: the type of node to create for the workspace item.
    
    Returns:
        The inserted graph node.
    """
    
    # make a default node
    node = schemas.create_node(node_type, workflow_id, oid)
    node["matrix"] = make_matrix(oid, node_type)
    node["parameters"] = schemas.create_node_parameters(node_type)
    res = db.graph.insert_one(node)
    node = db.graph.find_one({"_id": res.inserted_id})

    return node


def make_edge(db: database.Database, workflow_id: ObjectId,
        source_oid: ObjectId, 
        source_type: schemas.NodeType,
        target_oid: ObjectId, 
        target_type: schemas.NodeType, 
        edge_type: schemas.EdgeType):
    """Makes a new edge in the graph.
    
    Args:
        source_oid: 
            The OID for the workspace item that is being connected from. Can 
            be either direct a graph node or a workspace item that doesn't 
            yet have a graph node.
        
        source_type:
            Type of the source workspace item or node.

        target_oid:
            The OID for the workspace item that is being connected to. All
            targets must already exist as nodes in the graph.

        target_type:
            Type of the target node.

        edge_type:
            Type of the edge to create.
    
    Effects:
        Creates edges in the database between nodes.
    
    Returns:
        None
    """
    
    source = db.graph.find_one(source_oid)
    target = db.graph.find_one(target_oid)
    
    if type(source["reference"]) != ObjectId:
        source["reference"] = source["_id"]
        
    if type(target["reference"]) != ObjectId:
        target["reference"] = target["_id"]

    if (source == None or target == None):
        raise Exception("Source or target node is None.")
    
    # Update source to include outgoing edge to target.
    db.graph.update_one(
        {"_id": source["_id"]},
        {
            "$addToSet": {
                f"edges.output": schemas.create_edge(target["reference"], target_oid, target_type)
            }
        }
    )
    
    # Update target to include incoming edge from source.
    db.graph.update_one(
        {"_id": target["_id"]},
        {
            "$addToSet": {
                f"edges.{edge_type}": schemas.create_edge(source["reference"], source_oid, source_type)
            }
        }
    )
    
    # recalculate the graph from this node on
    graph(db, target_oid)


def remove_edge(db: database.Database,
        source_oid: ObjectId, 
        target_oid: ObjectId, 
        edge_type: schemas.EdgeType):
    """Removes an edge from the graph.
    """

    # There may be multiple corresponding nodes for this source_oid
    # but there should be only one possible target_oid since each target is unique
    source = db.graph.find_one(
        {
            "$or": [
                {"reference": source_oid, "edges.output.nodeid": target_oid},
                {"_id": source_oid, "edges.output.nodeid": target_oid}
            ]
        }
    )
    
    db.graph.update_one(
        {"_id": source["_id"]},
        {
            "$pull": {
                "edges.output": {"nodeid": target_oid}
            }
        }
    )

    db.graph.update_one(
        {"_id": target_oid},
        {
            "$pull": {
                f"edges.{edge_type}": {"nodeid": source["_id"]}
            }
        }
    )

    graph(db, target_oid)

    return


def graph(db: database.Database, node_oid: ObjectId):
    """Recalculates all nodes to the right of specified node.
    """

    db.graph.update_one({"_id": ObjectId(str(node_oid))}, {"$set": {"doclists": []}})
    node = db.graph.find_one({"_id": ObjectId(str(node_oid))})
    
    sources  = node["edges"]["source"]
    controls = node["edges"]["control"]
    outputs  = node["edges"]["output"]

    parameters = node["parameters"]
    node_type = node["type"]

    match node_type:
        case "Document":
            node = update_document(db, node, parameters)
        case "Group":
            node = update_group(db, node, parameters)
        case "Search":
            node = update_search(db, node, parameters)
        case "Note":
            node = update_note(db, node, parameters)
        case "Teleoscope":
            if db.name == "aita":
                node = update_teleoscope_chroma(db, node, sources, controls, parameters)
            else:
                node = update_teleoscope(db, node, sources, controls, parameters)
        case "Projection":
            node = update_projection(db, node, sources, controls, parameters)
        case "Union":
            node = update_union(db, node, sources, controls, parameters)
        case "Intersection":
            node = update_intersection(db, node, sources, controls, parameters)
        case "Exclusion":
            node = update_exclusion(db, node, sources, controls, parameters)
        case "Difference":
            node = update_difference(db, node, sources, controls, parameters)
        case "Filter":
            node = update_filter(db, node, sources, controls, parameters)

    res = db.graph.replace_one({"_id": node_oid}, node)

    # Calculate each node downstream to the right.
    for edge in outputs:
        graph(db, edge["nodeid"])
    
    return res

################################################################################
# Helpers
################################################################################
def make_matrix(node_type: schemas.NodeType, oid: ObjectId):
    return []


def update_matrix(oid: ObjectId, node_type: schemas.NodeType, graph_oid: ObjectId):
    return []

def update_parameters(db, node, parameters):
    collection = utils.get_collection(db, node["type"])
    params = node["parameters"]

    for key, value in parameters.items():
        params[key] = value

    res = collection.update_one(
        {"_id": node["_id"]}, 
        {"$set": {"parameters": params}}
    )
    return res


################################################################################
# Update Document
################################################################################

def update_document(db: database.Database, document_node, parameters):
    document_id = ObjectId(str(document_node["reference"]))
    doclist = {
        "id": document_id,
        "nodeid": document_node["_id"],
        "type": document_node["type"],
        "ranked_documents": [(document_id, 1.0)]
    }
    document_node["doclists"] = [doclist]
    return document_node


################################################################################
# Update Group
################################################################################

def update_group(db: database.Database, group_node, parameters):
    group_id = ObjectId(str(group_node["reference"]))
    group = db.groups.find_one(group_id)
    documents = group["history"][0]["included_documents"]
    
    doclist = {
        "id": group_id,
        "nodeid": group_node["_id"],
        "type": group_node["type"],
        "ranked_documents": [(d, 1.0) for d in documents]
    }
    group_node["doclists"] = [doclist]
    return group_node


################################################################################
# Update Note
################################################################################

def update_note(db: database.Database, note_node, parameters):
    note_id = ObjectId(str(note_node["reference"]))
    note = db.notes.find_one(note_id)
    documents = []
    
    doclist = {
        "id": note_id,
        "nodeid": note_node["_id"],
        "type": note_node["type"],
        "ranked_documents": []
    }

    note_node["doclists"] = [doclist]
    return note_node


################################################################################
# Update Search
################################################################################

def update_search(db: database.Database, search_node, parameters):
    search_id = ObjectId(str(search_node["reference"]))
    search = db.searches.find_one(search_id)
    documents = list(
        db.documents.find(
            utils.make_query(search["history"][0]["query"]), 
            {"projection": { "_id": 1 }}
        ).limit(1000)
    )
    doclist = {
        "id": search_id,
        "nodeid": search_node["_id"], 
        "type": search_node["type"],
        "ranked_documents": [(d["_id"], 1.0) for d in documents]
    }
    search_node["doclists"] = [doclist]
    return search_node


################################################################################
# Update Teleoscope
################################################################################

def update_teleoscope_chroma(db: database.Database, teleoscope_node, sources: List, controls: List, parameters):
    
    if len(controls) == 0:
        logging.info(f"No controls included. Returning original teleoscope node.")
        return teleoscope_node

    chroma_client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT, settings=Settings(anonymized_telemetry=False))
    logging.debug("Connected to client {chroma_client}.")

    chroma_collection = chroma_client.get_collection(db.name)
    logging.debug("Found collection {chroma_colection}.")

    control_oids = get_control_oids(db, controls)

    chroma_results = chroma_collection.get(ids=[str(control) for control in list(set(control_oids))], include=["embeddings"])
    control_vectors = [np.array(v) for v in chroma_results["embeddings"]]
    logging.debug("Found vectors {control_vectors} for controls {controls}.")

    search_vector = np.average(control_vectors, axis=0)
    logging.debug("Search vector is: {search_vector}.")

    source_map = []
    doclists = []
    
    if len(sources) == 0:
        distance = 0.5
        if "distance" in parameters:
            distance = parameters["distance"]
        
        # Get results until distance has been met
        n_results = 64
        results = chroma_collection.query(query_embeddings=[list(search_vector)], n_results=n_results, include=["distances"])
        while results["distances"][0][-1] < distance:
            n_results = n_results * 2
            results = chroma_collection.query(query_embeddings=[list(search_vector)], n_results=n_results, include=["distances"])    

        # Cut results off at distance max
        index = utils.binary_search(results["distances"][0], distance)
        ranks = zip(results["ids"][0][0:index], results["distances"][0][0:index])
        doclists.append({ "ranked_documents": list(ranks), "type": "All"})

    else:
        for source in sources:
            match source["type"]:
                case "Document":
                    oids = [source["id"]]
                    results = chroma_collection.get(ids=[str(oid) for oid in oids], include=["embeddings"])
                    source_map.append((source, [ObjectId(oid) for oid in results["ids"]], results["embeddings"]))
                case "Group":
                    group = db.groups.find_one({"_id": source["id"]})
                    oids = group["history"][0]["included_documents"]
                    results = chroma_collection.get(ids=[str(oid) for oid in oids], include=["embeddings"])
                    source_map.append((source, [ObjectId(oid) for oid in results["ids"]], results["embeddings"]))
                case "Search":
                    search = db.searches.find_one({"_id": source["id"]})
                    cursor = db.documents.find(utils.make_query(search["history"][0]["query"]),projection={ "_id": 1})
                    oids = [d["_id"] for d in list(cursor)]
                    results = chroma_collection.get(ids=[str(oid) for oid in oids], include=["embeddings"])
                    source_map.append((source, [ObjectId(oid) for oid in results["ids"]], results["embeddings"]))
                case "Union" | "Difference" | "Intersection" | "Exclusion":
                    node = db.graph.find_one({"_id": source["id"]})
                    node_doclists = node["doclists"]
                    for doclist in node_doclists:
                        oids = [d[0] for d in doclist["ranked_documents"]]
                        results = chroma_collection.get(ids=[str(oid) for oid in oids], include=["embeddings"])
                        source_map.append((source, [ObjectId(oid) for oid in results["ids"]], results["embeddings"]))
                case "Note":
                    pass

        for source, source_oids, source_vecs in source_map:
            ranks = rank(control_vectors, source_oids, source_vecs)
            source["ranked_documents"] = ranks
            doclists.append(source)

    teleoscope_node["doclists"] = doclists
    
    return teleoscope_node
        



def update_teleoscope(db: database.Database, teleoscope_node, sources: List, controls: List, parameters):
    rank_slice_length = 1000
    if "rank_slice_length" in parameters:
        rank_slice_length = parameters["rank_slice_length"]
    
    similarity = 0.4
    if "similarity" in parameters:
        similarity = parameters["similarity"]
    

    logging.info(
        f"Updating Teleoscope for database {db.name} and node {teleoscope_node['_id']} with "
        f"sources {sources} and controls {controls} and paramaters {parameters}."
    )

    if len(controls) == 0:
        logging.info(f"No controls included. Returning original teleoscope node.")
        return teleoscope_node
    
    ids, all_vectors = utils.get_documents(db.name)

    logging.info(f"Found {len(ids)} IDs and {len(all_vectors)} vectors.")

    if len(ids) == 0 or len(all_vectors) == 0:
        raise Exception("Zero-length vector sources. Were vectors downloaded?")
    
    control_vecs = get_control_vectors(db, controls, ids, all_vectors)

    doclists = []
    source_map = []
    
    if len(sources) == 0:
        ranks = rank_similarity(control_vecs, ids, all_vectors, similarity)
        doclists.append({ "ranked_documents": ranks, "type": "All"})
    else:
        for source in sources:
            match source["type"]:
                case "Document":
                    oids = [source["id"]]
                    vecs = np.array(filter_vectors_by_oid(oids, ids, all_vectors))
                    source_map.append((source, vecs, oids))
                case "Group":
                    group = db.groups.find_one({"_id": source["id"]})
                    oids = group["history"][0]["included_documents"]
                    vecs = np.array(filter_vectors_by_oid(oids, ids, all_vectors))
                    source_map.append((source, vecs, oids))
                case "Search":
                    search = db.searches.find_one({"_id": source["id"]})
                    cursor = db.documents.find(utils.make_query(search["history"][0]["query"]),projection={ "_id": 1}).limit(rank_slice_length)
                    oids = [d["_id"] for d in list(cursor)]
                    vecs = np.array(filter_vectors_by_oid(oids, ids, all_vectors))
                    source_map.append((source, vecs, oids))
                case "Union" | "Difference" | "Intersection" | "Exclusion":
                    node = db.graph.find_one({"_id": source["id"]})
                    node_doclists = node["doclists"]
                    for doclist in node_doclists:
                        oids = [d[0] for d in doclist["ranked_documents"]]
                        vecs = np.array(filter_vectors_by_oid(oids, ids, all_vectors))
                        source_map.append((doclist, vecs, oids))
                case "Note":
                    pass

    
    for source, source_vecs, source_oids in source_map:
        ranks = rank(control_vecs, source_oids, source_vecs)
        source["ranked_documents"] = ranks
        doclists.append(source)
        
    teleoscope_node["doclists"] = doclists
    
    # TODO: matrix
    return teleoscope_node


def rank(control_vecs, ids, source_vecs):
    logging.info(f"There were {len(control_vecs)} control vecs and {len(source_vecs)} source vecs.")
    logging.info(f"Control vec: {control_vecs}.")
    vec = np.average(control_vecs, axis=0)
    scores = utils.calculateSimilarity(source_vecs, vec)
    ranks = utils.rankDocumentsBySimilarity(ids, scores)
    return ranks


def rank_similarity(control_vecs, ids, vecs, similarity):
    logging.info(f"There were {len(control_vecs)} control vecs.")
    vec = np.average(control_vecs, axis=0)
    scores = utils.calculateSimilarity(vecs, vec)
    ranks = utils.rankDocumentsBySimilarityThreshold(ids, scores, similarity)
    logging.info(f"Found {len(ranks)} documents at similarity {similarity}.")
    return ranks

def filter_vectors_by_oid(oids, ids, vectors):
    # ids and vecs must correspond
    # vecs = [vectors[ids.index(oid)] for oid in oids]
    vecs = []
    for oid in oids:
        try:
            vecs.append(vectors[ids.index(oid)])
        except ValueError:
            continue

    return vecs


def get_control_oids(db: database.Database, controls):
    oids = []
    for c in controls:
        match c["type"]:
            case "Document":
                oids.append(c["id"])
            case "Group":
                group = db.groups.find_one({"_id": c["id"]})
                oids = oids + group["history"][0]["included_documents"]
            case "Search":
                search = db.searches.find_one({"_id": c["id"]})
                cursor = db.documents.find(utils.make_query(search["history"][0]["query"]),projection={ "_id": 1})
                oids = oids + [d["_id"] for d in list(cursor)]
            case "Note":
                oids.append(c["id"])
            case "Union" | "Difference" | "Intersection" | "Exclusion":
                node = db.graph.find_one({"_id": c["id"]})
                for doclist in node["doclists"]:
                        oids = oids + [d[0] for d in doclist["ranked_documents"]]
    return oids



def get_control_vectors(db: database.Database, controls, ids, all_vectors):
    oids = []
    notes = []
    for c in controls:
        match c["type"]:
            case "Document":
                oids.append(c["id"])
            case "Group":
                group = db.groups.find_one({"_id": c["id"]})
                oids = oids + group["history"][0]["included_documents"]
            case "Search":
                search = db.searches.find_one({"_id": c["id"]})
                cursor = db.documents.find(utils.make_query(search["history"][0]["query"]),projection={ "_id": 1})
                oids = oids + [d["_id"] for d in list(cursor)]
            case "Note":
                note = db.notes.find_one({"_id": c["id"]})
                notes.append(note)
            case "Union" | "Difference" | "Intersection" | "Exclusion":
                node = db.graph.find_one({"_id": c["id"]})
                for doclist in node["doclists"]:
                        oids = oids + [d[0] for d in doclist["ranked_documents"]]
                    
    note_vecs = [np.array(note["textVector"]) for note in notes]
    filtered_vecs = filter_vectors_by_oid(oids, ids, all_vectors)
    out_vecs = filtered_vecs + note_vecs
    logging.info(f"Got {len(oids)} as control vectors for controls {len(controls)}, with {len(ids)} ids and {len(all_vectors)} comparison vectors.")
    return out_vecs


################################################################################
# Update Projection
################################################################################

def update_projection(db: database.Database, projection_node, sources: List, controls: List, parameters):

    if len(controls) == 0:
        logging.info(f"No controls included. Returning original projection node.")
        return projection_node
    
    if len(controls) == 1:
        match controls[0]["type"]:
            case "Search" | "Note":
                logging.info(f"This node type cannot be the only control input. Returning original projection node.")                
                return projection_node
            
    
    logging.info(f"Updating Projection id: {projection_node['_id']}")

    ordering = parameters["ordering"]
    separation = parameters["separation"]

    logging.info(f"Running with {ordering} ordering and seperation = {separation}")

    project = projection.Projection(db, sources, controls, projection_node['_id'], ordering, separation)
    doclists = project.clustering_task()
    
    for doclist in doclists:
        doclist["id"] = projection_node["_id"]
        doclist["nodeid"] = projection_node["_id"]
        
    projection_node["doclists"] = doclists
    
    # TODO: matrix
    return projection_node


################################################################################
# Update Boolean Operations
################################################################################

def update_boolean(db, node, sources: List, controls: List, parameters, operation):
    doclists = []
    source_map = []
    control_oids = []

    for control in controls:
            match control["type"]:
                case "Document":
                    oids = [control["id"]]
                    control_oids = control_oids + oids
                case "Group":
                    group = db.groups.find_one({"_id": control["id"]})
                    oids = group["history"][0]["included_documents"]
                    control_oids = control_oids + oids
                case "Search":
                    search = db.searches.find_one({"_id": control["id"]})
                    cursor = db.documents.find(utils.make_query(search["history"][0]["query"]),projection={ "_id": 1})
                    oids = [d["_id"] for d in list(cursor)]
                    control_oids = control_oids + oids
                case "Union" | "Difference" | "Intersection" | "Exclusion":
                    node = db.graph.find_one({"_id": control["id"]})
                    for doclist in node["doclists"]:
                        oids = [d[0] for d in doclist["ranked_documents"]]
                        control_oids = control_oids + oids
                case "Note":
                    pass
    
    for source in sources:
            match source["type"]:
                case "Document":
                    oids = [source["id"]]
                    oids = operation(oids, control_oids)
                    source_map.append((source, oids))
                case "Group":
                    group = db.groups.find_one({"_id": source["id"]})
                    oids = group["history"][0]["included_documents"]
                    oids = operation(oids, control_oids)
                    source_map.append((source, oids))
                case "Search":
                    search = db.searches.find_one({"_id": source["id"]})
                    cursor = db.documents.find(utils.make_query(search["history"][0]["query"]),projection={ "_id": 1})
                    oids = [d["_id"] for d in list(cursor)]
                    oids = operation(oids, control_oids)
                    source_map.append((source, oids))
                case "Union" | "Difference" | "Intersection" | "Exclusion":
                    node = db.graph.find_one({"_id": source["id"]})
                    for doclist in node["doclists"]:
                        oids = [d[0] for d in doclist["ranked_documents"]]
                        oids = operation(oids, control_oids)
                        new_dl = schemas.create_doclist(source["id"], source["nodeid"], source["type"])
                        source_map.append((new_dl, oids))
                case "Note":
                    pass
    
    for source, source_oids in source_map:
        ranks = [(oid, 1.0) for oid in source_oids]
        source["ranked_documents"] = ranks
        doclists.append(source)

    return doclists


def update_difference(db, node, sources: List, controls: List, parameters):
    def difference(current_oids, control_oids):
        curr = set(current_oids)
        ctrl = set(control_oids)
        return list(curr.difference(ctrl))
    
    doclists = update_boolean(db, node, sources, controls, parameters, difference)
    
    node["doclists"] = doclists
    return node

def update_union(db, node, sources: List, controls: List, parameters):
    def union(current_oids, control_oids):
        curr = set(current_oids)
        ctrl = set(control_oids)
        return list(curr.union(ctrl))
    
    doclists = update_boolean(db, node, sources, controls, parameters, union)
    
    node["doclists"] = doclists
    return node


def update_intersection(db, node, sources: List, controls: List, parameters):
    def intersection(current_oids, control_oids):
        curr = set(current_oids)
        ctrl = set(control_oids)
        return list(curr.intersection(ctrl))
    
    doclists = update_boolean(db, node, sources, controls, parameters, intersection)
    
    node["doclists"] = doclists
    return node


def update_exclusion(db, node, sources: List, controls: List, parameters):
    def exclusion(current_oids, control_oids):
        curr = set(current_oids)
        ctrl = set(control_oids)
        diff_curr = curr.difference(ctrl)
        diff_ctrl = ctrl.difference(curr)
        return list(diff_curr.union(diff_ctrl))
    
    doclists = update_boolean(db, node, sources, controls, parameters, exclusion)
    
    node["doclists"] = doclists
    return node


def update_filter(db, node, sources: List, controls: List, parameters):
    return node # stub


