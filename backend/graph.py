from bson.objectid import ObjectId
from pymongo import database
from typing import List
import numpy as np
import logging
import requests

import os
import itertools
import uuid
from celery import Celery
from kombu import Exchange, Queue

# package files
from backend import embeddings
from . import utils
from . import projection

# environment variables
from dotenv import load_dotenv

load_dotenv()  # This loads the variables from .env

from FlagEmbedding import BGEM3FlagModel

# Define a global model variable
model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=True)


# RabbitMQ connection details
RABBITMQ_USERNAME = os.getenv("RABBITMQ_USERNAME")
RABBITMQ_PASSWORD = os.getenv("RABBITMQ_PASSWORD")
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST")
RABBITMQ_VHOST = os.getenv("RABBITMQ_VHOST")
RABBITMQ_TASK_QUEUE = os.getenv("RABBITMQ_TASK_QUEUE")

if not RABBITMQ_USERNAME:
    logging.info("Missing environment variable RABBITMQ_USERNAME")
if not RABBITMQ_PASSWORD:
    logging.info("Missing environment variable RABBITMQ_PASSWORD")
if not RABBITMQ_HOST:
    logging.info("Missing environment variable RABBITMQ_HOST")
if not RABBITMQ_VHOST:
    logging.info("Missing environment variable RABBITMQ_VHOST")
if not RABBITMQ_TASK_QUEUE:
    logging.info("Missing environment variable RABBITMQ_TASK_QUEUE")

# Broker URL for Celery
CELERY_BROKER_URL = (
    f"amqp://"
    f"{RABBITMQ_USERNAME}:"
    f"{RABBITMQ_PASSWORD}@"
    f"{RABBITMQ_HOST}/"
    f"{RABBITMQ_VHOST}"
)

# Queue and Celery app setup
queue = Queue("graph", Exchange("graph"), "graph")
app = Celery("backend.graph", backend="rpc://", broker=CELERY_BROKER_URL)

app.conf.update(
    task_serializer="pickle",
    accept_content=["pickle", "json"],  # Ignore other content
    result_serializer="pickle",
    task_queues=[queue],
    worker_concurrency=1,
)


################################################################################
# Tasks to register
################################################################################
@app.task
def update_nodes(*args, database: str, node_uids: List[str], **kwargs):
    logging.info(f"Updating {len(node_uids)} nodes.")
    db = utils.connect(db=database)
    for node_uid in node_uids:
        graph_uid(db, node_uid)
    return


@app.task
def milvus_chunk_import(database: str, userid: str, documents):
    logging.info(f"Recieved an import chunk of length {len(documents)} for database {database}.")
    client = embeddings.connect()
    embeddings.milvus_setup(client, collection_name=database)
    mongo_db = utils.connect(db=database)
    docs = mongo_db.documents.find(
        {"_id": {"$in": [ObjectId(str(d)) for d in documents]}}
    )
    data = vectorize(list(docs))
    res = client.upsert(collection_name=database, data=data)
    client.close()
    logging.info(f"Finished processing an import chunk of length {len(documents)} for database {database}.")
    return res


@app.task
def milvus_import(
    *args,
    database: str,
    userid: str,
):
    logging.info(f"Vectorizing all documents in database {database}...")
    client = embeddings.connect()
    embeddings.milvus_setup(client, collection_name=database)

    mongo_db = utils.connect(db=database)

    documents = mongo_db.documents.find({})
    for batch in itertools.batched(documents, 1000):
        data = vectorize(batch)
        res = client.upsert(collection_name=database, data=data)
    client.close()
    logging.info(f"Finished vectorizing all documents in database {database}.")
    return res


@app.task
def update_vectors(database: str, documents):
    logging.info(f"Updating {len(documents)} vectors in database {database}...")
    client = embeddings.connect()
    embeddings.milvus_setup(client, collection_name=database)
    data = vectorize(documents)
    res = client.upsert(collection_name=database, data=data)
    client.close()
    logging.info(f"Finished updating {len(documents)} vectors in database {database}.")
    return res

################################################################################
# Model functions
################################################################################

def vectorize(documents):
    process_documents(documents)
    # logging.info(f"Vectorizing {len(documents)} documents...")
    # ids = [str(doc["_id"]) for doc in documents]
    # docs = [doc["text"] for doc in documents]
    # logging.info("Starting model encoding...")
    # raw_embeddings = model.encode(docs)
    # logging.info("Model encoding complete.")
    
    # dense_vecs = raw_embeddings["dense_vecs"]
    # embeddings = [embedding.tolist() for embedding in dense_vecs]

    # logging.info(f"{len(embeddings)} embeddings created.")
    # data = [{"id": id_, "vector": embedding} for id_, embedding in zip(ids, embeddings)]
    # logging.info(f"Finished vectorizing {len(documents)} documents.")
    # return data


@app.task
def process_documents(documents):
    try:
        # Send request to the local API service
        response = requests.post('http://127.0.0.1:8000/vectorize', json={
            'documents': documents
        })

        # Check the response status and return the result
        if response.status_code == 200:
            result = response.json()
            return result
        else:
            logging.error(f"API request failed with status {response.status_code}: {response.text}")
            raise Exception("Model service error")

    except requests.RequestException as e:
        logging.error(f"Request error: {e}")
        raise Exception("Failed to connect to model service")

################################################################################
# Graph API
################################################################################
def graph_uid(db, uid):
    db.graph.update_one({"uid": uid}, {"$set": {"doclists": []}})
    node = db.graph.find_one({"uid": uid})
    if not node:
        logging.info(f"No node found for {uid}.")
        return
    else:
        logging.info(f"Updating node {uid} with type {node["type"]}.")

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
    for edge_uid in outputs:
        graph_uid(db, edge_uid)

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
    logging.info(
        f"Found {len(control_vectors)} vectors for {len(control_oids)} controls."
    )

    # average the control vectors to create a rank search vector
    search_vector = np.average(control_vectors, axis=0)
    logging.info(f"Search vector shape is {search_vector.shape}.")

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
            search_params=search_params,
            limit=10000,
        )

        ranks = [(result["id"], float(result["distance"])) for result in results[0]]
        doclists.append(
            {"reference": None, "uid": None, "ranked_documents": ranks, "type": "All"}
        )

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

    ranked_documents_count = sum(
        [
            sum(
                len(doclist["ranked_documents"])
                for doclist in control_graph_item["doclists"]
            )
            for control_graph_item in control_graph_items
        ]
    )

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
        f"Found {len(source_nodes)} source nodes and {len(control_nodes)} control nodes."
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


def setup_logging():
    logging.basicConfig(
        level=logging.INFO,  # Set the desired log level
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(),  # Logs to console
            # Add more handlers here if needed, like FileHandler for logging to files
        ],
    )

def start_worker():
    worker = app.Worker(
        include=["backend.graph"],
        hostname=f"graph.{os.getlogin()}@%h{uuid.uuid4()}",
        loglevel="INFO",
    )
    worker.start()
    (
        [
            "worker",
            "--loglevel=INFO",
            f"--hostname=graph.{os.getlogin()}@%h{uuid.uuid4()}",
        ]
    )

def main():
    setup_logging()
    start_worker()
    


################################################################################
# Main for Celery worker
################################################################################
if __name__ == "__main__":
    main()
    
