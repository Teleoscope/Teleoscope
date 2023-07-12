from bson.objectid import ObjectId
from pymongo import MongoClient, database
from typing import List
import numpy as np
import logging

from . import schemas
from . import utils

################################################################################
# Graph API
################################################################################

def make_node(db: database.Database, 
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
    node = schemas.create_node(node_type)

    match node_type:
        # If a workspace item can only be a source, check to make sure it has a 
        # corresponding node in the graph and make one if it does not exist.
        # If it does exist, update the matrix just in case.
        case "Document" | "Group" | "Search":
            obj = get_collection(db, node_type).find_one({"_id": oid})
            if obj:
                if "node" not in obj:
                    node["matrix"] = make_matrix(oid, node_type)
                    res = db.graph.insert_one(node)
                    get_collection(db, node_type).update_one(
                        {"_id": oid}, 
                        {"$set": {"node": res.inserted_id}}
                    )
                    node = db.graph.find_one({"_id": res.inserted_id})
                    update_matrix(oid, node_type, node["_id"])
                else:
                    node = db.graph.find_one({"_id": obj["node"]})
                    update_matrix(oid, node_type, obj["node"])
            else:
                raise Exception(f"Can only make source node for existing source. Tried for {node_type} {oid}.")
        
        # If the workspace item is an operation, then it can be a source
        # or a target. In that case, every instance on the workspace corresponds
        # to only one graph node, which is created new. Note that there's no point
        # in updating the matrix because there's no input to the matrix yet.
        case "Teleoscope" | "Union" | "Intersection" | "Exclusion" | "Subtraction":
            node["matrix"] = make_matrix(oid, node_type)
            res = db.graph.insert_one(node)
            node = db.graph.find_one({"_id": res.inserted_id})
    return node


def make_edge(db: database.Database,
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
    
    source = get_collection(db, source_type).find_one(source_oid)
    target = get_collection(db, target_type).find_one(target_oid)
    
    # Ensure the source is from the graph. Target should always be.
    match source_type:
        case "Group" | "Document" | "Search":
            if "node" in source:
                source = db.graph.find_one({"_id": source["node"]})
            else:
                source = make_node(db, source_oid, source_type)

    if (source == None or target == None):
        raise Exception("Source or target node is None.")
    
    # Update source to include outgoing edge to target.
    db.graph.update_one(
        {"_id": source["_id"]},
        {
            "$push": {
                f"edges.output": schemas.create_edge(target_oid, target["_id"], edge_type)
            }
        }
    )
    
    # Update target to include incoming edge from source.
    db.graph.update_one(
        {"_id": target["_id"]},
        {
            "$push": {
                f"edges.{edge_type}": schemas.create_edge(source_oid, source["_id"], edge_type)
            }
        }
    )
    
    # recalculate the graph from this node on
    graph(db, target["_id"])


def graph(db: database.Database, node_oid: ObjectId):
    """Recalculates all nodes to the right of specified node.
    """
    node = db.graph.find_one({"_id": node_oid})

    sources  = node["edges"]["source"]
    controls = node["edges"]["control"]
    outputs  = node["edges"]["output"]

    parameters = node["parameters"]
    node_type = node["type"]

    match node_type:
        case "Teleoscope":
            node = update_teleoscope(db, node, sources, controls, parameters)
        case "Union":
            node = update_union(db, node, sources, controls, parameters)
        case "Intersection":
            node = update_intersection(db, node, sources, controls, parameters)
        case "Exclusion":
            node = update_exclusion(db, node, sources, controls, parameters)
        case "Filter":
            node = update_filter(db, node, sources, controls, parameters)

    res = db.graph.replace_one({"_id": node_oid}, node)

    # Calculate each node downstream to the right.
    for oid in outputs:
        graph(db, oid)
    
    return res

################################################################################
# Helpers
################################################################################
def get_collection(db: database.Database, node_type: schemas.NodeType):
    """Return the collection for a node type.
    """
    collection_map = {
        "Group": "groups",
        "Document": "documents",
        "Projection": "projections",
        "Intersection": "graph",
        "Exclusion": "graph",
        "Union": "graph",
        "Teleoscope": "graph",
    }

    return db.get_collection(collection_map[node_type])

def make_matrix(node_type: schemas.NodeType, oid: ObjectId):
    return []

def update_matrix(oid: ObjectId, node_type: schemas.NodeType, graph_oid: ObjectId):
    return []

def update_union(db, node, sources: List, controls: List, parameters):
    return node # stub

def update_intersection(db, node, sources: List, controls: List, parameters):
    return node # stub

def update_exclusion(db, node, sources: List, controls: List, parameters):
    return node # stub

def update_filter(db, node, sources: List, controls: List, parameters):
    return node # stub


################################################################################
# Update Teleoscope
################################################################################

def update_teleoscope(db: database.Database, node, sources: List, controls: List, parameters):
    logging.debug(
        f"Updating Teleoscope for database {db.name} and node {node} with "
        f"sources {sources} and controls {controls} and paramaters {parameters}."
    )
    
    ids, all_vectors = utils.get_documents(db.name)
    logging.debug(f"Found {len(ids)} IDs and {len(all_vectors)} vectors.")
    
    control_vecs = get_control_vectors(db, controls, ids, all_vectors)

    doclist = {}

    if len(sources) == 0:
        ranks = rank(control_vecs, ids, all_vectors)
        doclist["all"] = ranks[0:1000]
    else:
        source_map = []
        for source in sources:
            match source["type"]:
                case "Document":
                    oids = [source["id"]]
                    vecs = filter_vectors_by_oid(oids, ids, all_vectors)
                    source_map.append((source["id"], vecs, oids))
                case "Group":
                    group = db.groups.find_one({"_id": id})
                    oids = group["history"][0]["included_documents"]
                    vecs = filter_vectors_by_oid(oids, ids, all_vectors)
                    source_map.append((source["id"], vecs, oids))
                case "Search":
                    pass
    
    for source, vecs, oids in source_map:
        ranks = rank(control_vecs, ids, all_vectors)
        doclist[source["id"]] = ranks[0:1000]    
    
    db.graph.update_one(
        {"_id": node["_id"]},
        {
            "$set": {
                "doclists": doclist
            }
        }
    )
    # TODO: matrix
    return node

def rank(control_vecs, ids, vecs):
    logging.debug(f"Control vecs {control_vecs}.")
    vec = np.average(control_vecs, axis=0)
    scores = utils.calculateSimilarity(vecs, vec)
    ranks = utils.rankDocumentsBySimilarity(ids, scores)
    return ranks

def filter_vectors_by_oid(oids, ids, vectors):
    # ids and vecs must correspond
    vecs = [vectors[ids.index(oid)] for oid in oids]
    return vecs

def get_control_vectors(db: database.Database, controls, ids, all_vectors):
    oids = []
    for c in controls:
        match c["type"]:
            case "Document":
                oids.append(c["id"])
            case "Group":
                group = db.groups.find_one({"_id": id})
                oids = oids + group["history"][0]["included_documents"]
            case "Search":
                pass
    return filter_vectors_by_oid(oids, ids, all_vectors)
    

def get_source_vectors(db: database.Database, sources, ids, all_vectors):
    oids = []
    for s in sources:
        match c["type"]:
            case "Document":
                oids.append(s["id"])
            case "Group":
                pass
