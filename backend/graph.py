from bson.objectid import ObjectId
from pymongo import MongoClient, database
from typing import List
import numpy as np
import logging
from pymilvus import MilvusClient, DataType
from pprint import pformat
from functools import reduce

from backend import embeddings
from . import schemas
from . import utils
from . import projection

# environment variables
from dotenv import load_dotenv

load_dotenv()  # This loads the variables from .env
import os

MILVUS_HOST = os.getenv("MILVUS_HOST")
MIVLUS_PORT = os.getenv("MIVLUS_PORT")
MILVUS_USERNAME = os.getenv("MILVUS_USERNAME")
MILVUS_PASSWORD = os.getenv("MILVUS_PASSWORD")
MILVUS_DBNAME = os.getenv("MILVUS_DBNAME")
MILVUS_METRIC_TYPE = os.getenv("MILVUS_METRIC_TYPE")

################################################################################
# Graph API
################################################################################


def make_node(
    db: database.Database,
    workflow_id: ObjectId,
    oid: ObjectId,
    node_type: schemas.NodeType,
):
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


def make_edge(
    db: database.Database,
    workflow_id: ObjectId,
    source_oid: ObjectId,
    source_type: schemas.NodeType,
    target_oid: ObjectId,
    target_type: schemas.NodeType,
    edge_type: schemas.EdgeType,
):
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

    if source == None or target == None:
        raise Exception("Source or target node is None.")

    # Update source to include outgoing edge to target.
    db.graph.update_one(
        {"_id": source["_id"]},
        {
            "$addToSet": {
                f"edges.output": schemas.create_edge(
                    target["reference"], target_oid, target_type
                )
            }
        },
    )

    # Update target to include incoming edge from source.
    db.graph.update_one(
        {"_id": target["_id"]},
        {
            "$addToSet": {
                f"edges.{edge_type}": schemas.create_edge(
                    source["reference"], source_oid, source_type
                )
            }
        },
    )

    # recalculate the graph from this node on
    graph(db, target_oid)


def remove_edge(
    db: database.Database,
    source_oid: ObjectId,
    target_oid: ObjectId,
    edge_type: schemas.EdgeType,
):
    """Removes an edge from the graph."""

    # There may be multiple corresponding nodes for this source_oid
    # but there should be only one possible target_oid since each target is unique
    source = db.graph.find_one(
        {
            "$or": [
                {"reference": source_oid, "edges.output.nodeid": target_oid},
                {"_id": source_oid, "edges.output.nodeid": target_oid},
            ]
        }
    )

    db.graph.update_one(
        {"_id": source["_id"]}, {"$pull": {"edges.output": {"nodeid": target_oid}}}
    )

    db.graph.update_one(
        {"_id": target_oid},
        {"$pull": {f"edges.{edge_type}": {"nodeid": source["_id"]}}},
    )

    graph(db, target_oid)

    return


def update_nodes(db: database.Database, node_uids: List[str]):
    for node_uid in node_uids:
        graph_uid(db, node_uid)

    # pass


def graph_uid(db, uid):
    db.graph.update_one({"uid": uid}, {"$set": {"doclists": []}})
    node = db.graph.find_one({"uid": uid})
    if not node:
        logging.info(f"No node found for {uid}.")
        return

    sources = node["edges"]["source"]
    controls = node["edges"]["control"]
    outputs = node["edges"]["output"]

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
        case "Rank":
            node = update_rank(db, node, sources, controls, parameters)
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

    res = db.graph.replace_one({"uid": uid}, node)

    # Calculate each node downstream to the right.
    for edge in outputs:
        graph_uid(db, edge["uid"])

    return res


def graph(db: database.Database, node_oid: ObjectId):
    """Recalculates all nodes to the right of specified node."""

    db.graph.update_one({"_id": ObjectId(str(node_oid))}, {"$set": {"doclists": []}})
    node = db.graph.find_one({"_id": ObjectId(str(node_oid))})

    sources = node["edges"]["source"]
    controls = node["edges"]["control"]
    outputs = node["edges"]["output"]

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
            node = update_teleoscope_milvus(db, node, sources, controls, parameters)
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

    res = db.graph.replace_one({"_id": node_oid}, pformat(node))

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

    res = collection.update_one({"_id": node["_id"]}, {"$set": {"parameters": params}})
    return res


################################################################################
# Update Document
################################################################################


def update_document(db: database.Database, document_node, parameters):
    document_id = ObjectId(str(document_node["reference"]))
    doclist = {
        "reference": document_id,
        "uid": document_node["uid"],
        "type": document_node["type"],
        "ranked_documents": [(document_id, 1.0)],
    }
    document_node["doclists"] = [doclist]
    return document_node


################################################################################
# Update Group
################################################################################


def update_group(db: database.Database, group_node, parameters):
    group_id = ObjectId(str(group_node["reference"]))
    group = db.groups.find_one(group_id)
    documents = group["docs"]

    doclist = {
        "reference": group_id,
        "uid": group_node["uid"],
        "type": group_node["type"],
        "ranked_documents": [(d, 1.0) for d in documents],
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
        "reference": note_id,
        "uid": note_node["uid"],
        "type": note_node["type"],
        "ranked_documents": [],
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
            utils.make_query(search["query"]), {"projection": {"_id": 1}}
        ).limit(1000)
    )
    doclist = {
        "reference": search_id,
        "uid": search_node["uid"],
        "type": search_node["type"],
        "ranked_documents": [(d["_id"], 1.0) for d in documents],
    }
    search_node["doclists"] = [doclist]
    return search_node


################################################################################
# Update Rank
################################################################################


def update_rank(
    mdb: database.Database, rank_node, sources: List, controls: List, parameters
):
    # check if it's worth updating the node
    if len(controls) == 0:
        logging.info(f"No controls included. Returning original teleoscope node.")
        return rank_node

    # collection name should be something unique
    collection_name = mdb.name

    # connect to Milvus
    client = embeddings.connect()

    # get every document oid from the control nodes
    control_oids = utils.get_doc_oids(mdb, controls, exclude=[])
    logging.info(f"Documents with oids {control_oids} found for controls {controls}.")

    # get the vectors for each document vector id
    milvus_results = embeddings.get_embeddings(client, collection_name, control_oids)

    # unpack results
    control_vectors = [np.array(res["vector"]) for res in milvus_results]
    logging.info(f"Found vectors {control_vectors} for controls {control_oids}.")

    # average the control vectors to create a rank search vector
    search_vector = np.average(control_vectors, axis=0)
    logging.info(f"Search vector is: {search_vector}.")

    # set the distance from the search vector that we care to look
    distance = 0.5
    if "distance" in parameters:
        distance = parameters["distance"]

    # get the index to search over
    index = client.describe_index(
        collection_name=collection_name, index_name="vector_index", field_name="vector"
    )

    # set up parameters for the vector search
    search_params = {
        # use `IP` as the metric to calculate the distance
        # needs to match the index in the collection
        "metric_type": index["metric_type"],
        "params": {
            # search for vectors with a distance greater than 0.8
            "radius": 1 - distance,
            # filter out most similar vectors with a distance greater than or equal to 1.0
            "range_filter": (1 - distance) + 1.0,
        },
    }

    # doclists to append to the graph node
    source_map = []
    doclists = []

    # search defaults to the whole corpus
    if len(sources) == 0:
        # Get results within radius
        results = client.search(
            collection_name=collection_name,
            data=[search_vector],
            anns_field="vector",
            param=search_params,
            limit=10000,
        )

        ranks = zip(results[0].ids, results[0].distances)
        doclists.append({"ranked_documents": list(ranks), "type": "All"})

    else:
        source_nodes = mdb.graph.find({"uid": {"$in": sources}})
        for source in source_nodes:
            oids = utils.get_oids(mdb, source)
            if oids:
                # results look like:
                # [  { "vector": [ ... ], "id": 'oid0128409128394' }, ..., { ... }  ]
                results = client.get(
                    collection_name=collection_name, ids=oids, output_fields=["vector"]
                )
                source_map.append((source, oids, [r["vector"] for r in results]))

        for source, source_oids, source_vecs in source_map:
            ranks = utils.rank(control_vectors, source_oids, source_vecs)
            doclists.append(
                {
                    "type": source["type"],
                    "uid": source["uid"],
                    "reference": source["reference"],
                    "ranked_documents": ranks,
                }
            )

    rank_node["doclists"] = doclists

    client.close()

    return rank_node


################################################################################
# Update Projection
################################################################################


def update_projection(
    db: database.Database, projection_node, sources: List, controls: List, parameters
):

    if len(controls) == 0:
        logging.info(f"No controls included. Returning original projection node.")
        return projection_node

    if len(sources) == 0:
        logging.info(f"No sources included. Returning original projection node.")
        return projection_node

    source_graph_items = list(db.graph.find({"uid": {"$in": sources}}))
    control_graph_items = list(db.graph.find({"uid": {"$in": controls}}))

    if len(control_graph_items) == 1:
        match control_graph_items[0]["type"]:
            case "Search" | "Note":
                logging.info(
                    f"This node type cannot be the only control input. Returning original projection node."
                )
                return projection_node
    
    ranked_documents_count = sum([
        sum(len(doclist['ranked_documents']) for doclist in control_graph_item['doclists'])
        for control_graph_item in control_graph_items
    ])

    if ranked_documents_count <= 4:
        logging.info(
            f"Not enough control documents included. Returning original projection node."
        )
        return projection_node

    logging.info(f"Updating Projection id: {projection_node['_id']}")

    # ordering = parameters["ordering"]
    # separation = parameters["separation"]

    # logging.info(f"Running with {ordering} ordering and seperation = {separation}")
    ordering = None
    separation = None

    project = projection.Projection(
        db,
        source_graph_items,
        control_graph_items,
        projection_node["_id"],
        ordering,
        separation,
    )
    doclists = project.document_ordering()

    # for doclist in doclists:
    #     doclist["id"] = projection_node["_id"]
    #     doclist["nodeid"] = projection_node["_id"]

    projection_node["doclists"] = doclists

    # TODO: matrix
    return projection_node


################################################################################
# Update Boolean Operations
################################################################################
def update_boolean_doclists(db, sources: List, controls: List, operation):
    doclists = []
    source_lists = []
    control_oids = []

    source_nodes = list(db.graph.find({"uid": {"$in": sources}}))
    control_nodes = list(db.graph.find({"uid": {"$in": controls}}))

    logging.info(
        f"Found source nodes {source_nodes} and control nodes {control_nodes}."
    )

    for control in control_nodes:
        control_oids.extend(utils.get_oids(db, control))

    for source in source_nodes:
        oids = utils.get_oids(db, source)
        source_lists.append((source, operation(oids, control_oids)))

    for source, source_oids in source_lists:
        ranks = [(oid, 1.0) for oid in source_oids]
        doclists.append(
            {
                "type": source["type"],
                "uid": source["uid"],
                "reference": source["reference"],
                "ranked_documents": ranks,
            }
        )
    return doclists


def update_difference(db, node, sources: List, controls: List, parameters):
    def difference(current_oids, control_oids):
        curr = set(current_oids)
        ctrl = set(control_oids)
        return list(curr.difference(ctrl))

    doclists = update_boolean_doclists(db, sources, controls, difference)

    node["doclists"] = doclists
    return node


def update_union(db, node, sources: List, controls: List, parameters):
    def union(current_oids, control_oids):
        curr = set(current_oids)
        ctrl = set(control_oids)
        return list(curr.union(ctrl))

    doclists = update_boolean_doclists(db, sources, controls, union)

    node["doclists"] = doclists
    return node


def update_intersection(db, node, sources: List, controls: List, parameters):
    def intersection(current_oids, control_oids):
        curr = set(current_oids)
        ctrl = set(control_oids)
        return list(curr.intersection(ctrl))

    doclists = update_boolean_doclists(db, sources, controls, intersection)

    node["doclists"] = doclists
    return node


def update_exclusion(db, node, sources: List, controls: List, parameters):
    def exclusion(current_oids, control_oids):
        curr = set(current_oids)
        ctrl = set(control_oids)
        diff_curr = curr.difference(ctrl)
        diff_ctrl = ctrl.difference(curr)
        return list(diff_curr.union(diff_ctrl))

    doclists = update_boolean_doclists(db, sources, controls, exclusion)

    node["doclists"] = doclists
    return node


def update_filter(db, node, sources: List, controls: List, parameters):
    return node  # stub
