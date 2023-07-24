from bson.objectid import ObjectId
from pymongo import MongoClient, database
from typing import List
import numpy as np
import logging
import bcrypt

from . import schemas
from . import utils
from . import projection

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
    node = schemas.create_node(node_type, oid)

    match node_type:
        # If a workspace item can only be a source, check to make sure it has a 
        # corresponding node in the graph and make one if it does not exist.
        # If it does exist, update the matrix just in case.
        case "Document" | "Group" | "Search" | "Note":
            obj = get_collection(db, node_type).find_one({"_id": oid})
            if obj:
                if "node" not in obj:
                    node["matrix"] = make_matrix(oid, node_type)
                    node["reference"] = oid

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
        case "Teleoscope" | "Projection" | "Union" | "Intersection" | "Exclusion" | "Subtraction":
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
        case "Group" | "Document" | "Search" | "Note":
            if "node" in source:
                logging.info("Found node in source, retrieving node...")
                source = db.graph.find_one({"_id": source["node"]})
            else:
                logging.info("Did not find node in source, making node...")
                source = make_node(db, source_oid, source_type)

    if (source == None or target == None):
        raise Exception("Source or target node is None.")
    
    # Update source to include outgoing edge to target.
    db.graph.update_one(
        {"_id": source["_id"]},
        {
            "$addToSet": {
                f"edges.output": schemas.create_edge(target_oid, target["_id"], target_type)
            }
        }
    )
    
    # Update target to include incoming edge from source.
    db.graph.update_one(
        {"_id": target["_id"]},
        {
            "$addToSet": {
                f"edges.{edge_type}": schemas.create_edge(source_oid, source["_id"], source_type)
            }
        }
    )
    
    # recalculate the graph from this node on
    graph(db, target["_id"])


def get_node(db, source_oid, source_type):
    match source_type:
        case "Document":
            document = db.documents.find_one(source_oid)
            return db.graph.find_one(document["node"])
        
        case "Group":
            group = db.groups.find_one(source_oid)
            return db.graph.find_one(group["node"])

        case "Search":
            search = db.searches.find_one(source_oid)
            return db.graph.find_one(search["node"])

        case "Note":
            note = db.notes.find_one(source_oid)
            return db.graph.find_one(note["node"])
        case _:
            return db.graph.find_one(source_oid)

def remove_edge(db: database.Database,
        source_oid: ObjectId, 
        source_type: schemas.NodeType, 
        target_oid: ObjectId, 
        target_type: schemas.NodeType, 
        edge_type: schemas.EdgeType):
    """Removes an edge from the graph.
    """
    source = get_node(db, source_oid, source_type)
    
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

    pass


def graph(db: database.Database, node_oid: ObjectId):
    """Recalculates all nodes to the right of specified node.
    """
    node = db.graph.find_one({"_id": ObjectId(str(node_oid))})
    db.graph.update_one({"_id":ObjectId(str(node_oid))}, {"$set": {"doclists": []}})

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
            node = update_teleoscope(db, node, sources, controls, parameters)
        case "Projection":
            node = update_projection(db, node, sources, controls, parameters)
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
    for edge in outputs:
        graph(db, edge["nodeid"])
    
    return res

################################################################################
# Helpers
################################################################################

def get_collection(db: database.Database, node_type: schemas.NodeType):
    """Return the collection for a node type.
    """
    collection_map = {
        "Document": "documents",
        "Group": "groups",
        "Search": "searches",
        "Note": "notes",
        "Projection": "graph",
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

def update_parameters(db, node, parameters):
    collection = get_collection(db, node["type"])
    res = collection.update_one(node["_id"], {"$set": {"parameters": parameters}})
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

def update_teleoscope(db: database.Database, teleoscope_node, sources: List, controls: List, parameters):
    rank_slice_length = 1000
    if "rank_slice_length" in parameters:
        rank_slice_length = parameters["rank_slice_length"]
    
    logging.debug(
        f"Updating Teleoscope for database {db.name} and node {teleoscope_node} with "
        f"sources {sources} and controls {controls} and paramaters {parameters}."
    )

    if len(controls) == 0:
        logging.info(f"No controls included. Returning original teleoscope node.")
        return teleoscope_node
    
    ids, all_vectors = utils.get_documents(db.name)

    logging.debug(f"Found {len(ids)} IDs and {len(all_vectors)} vectors.")

    if len(ids) == 0 or len(all_vectors) == 0:
        raise Exception("Zero-length vector sources. Were vectors downloaded?")
    
    control_vecs = get_control_vectors(db, controls, ids, all_vectors)

    doclists = []
    source_map = []
    
    if len(sources) == 0:
        ranks = rank(control_vecs, ids, all_vectors)
        doclists.append({ "ranked_documents": ranks[0:rank_slice_length], "type": "All"})
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
                case "Note":
                    pass

    for source, source_vecs, source_oids in source_map:
        ranks = rank(control_vecs, source_oids, source_vecs)
        source["ranked_documents"] = ranks[0:rank_slice_length]
        doclists.append(source)
        
    teleoscope_node["doclists"] = doclists
    
    # TODO: matrix
    return teleoscope_node

def rank(control_vecs, ids, vecs):
    logging.debug(f"There were {len(control_vecs)} control vecs.")
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
    note_vecs = [np.array(note["textVector"]) for note in notes]
    filtered_vecs = filter_vectors_by_oid(oids, ids, all_vectors)
    out_vecs = filtered_vecs + note_vecs
    logging.debug(f"Got {len(oids)} as control vectors for controls {len(controls)}, with {len(ids)} ids and {len(all_vectors)} comparison vectors.")
    return out_vecs

################################################################################
# Update Projection
################################################################################

def update_projection(db: database.Database, projection_node, sources: List, controls: List, parameters):

    logging.debug(
        f"Updating Projection for database {db.name} and node {projection_node} with "
        f"sources {sources} and controls {controls} and paramaters {parameters}."
    )

    if len(controls) == 0:
        logging.info(f"No controls included. Returning original projection node.")
        return projection_node
    
    if len(controls) == 1:
        match controls[0]["type"]:
            case "Search" | "Note":
                logging.info(f"This node type cannot be the only control input. Returning original projection node.")
                return projection_node
            
    if len(controls) > 1:
        c_types = [c["type"] for c in controls]
        if "Group" not in c_types or "Document" not in c_types:
            logging.info(f"Require group as control input. Returning original projection node.")
            return projection_node 

                   
    rank_slice_length = 1000
    if "rank_slice_length" in parameters:
        rank_slice_length = parameters["rank_slice_length"]
    
    project = projection.Projection(db, sources, controls, rank_slice_length)
    doclists = project.clustering_task()
        
    projection_node["doclists"] = doclists
    
    # TODO: matrix
    return projection_node

################################################################################
# Update Other Operations
################################################################################

def update_union(db, node, sources: List, controls: List, parameters):
    return node # stub


def update_intersection(db, node, sources: List, controls: List, parameters):
    return node # stub


def update_exclusion(db, node, sources: List, controls: List, parameters):
    return node # stub


def update_filter(db, node, sources: List, controls: List, parameters):
    return node # stub