# tasks.py
import logging
import json
import uuid
from warnings import simplefilter
from celery import Celery
from bson.objectid import ObjectId
from kombu import Exchange, Queue
from typing import List
import os

from pymongo import UpdateOne
from pymongo.errors import OperationFailure, ConfigurationError, WriteError


# Local imports
from backend import utils

# Environment variables
from dotenv import load_dotenv

load_dotenv()

RABBITMQ_USERNAME = os.getenv("RABBITMQ_USERNAME")
RABBITMQ_PASSWORD = os.getenv("RABBITMQ_PASSWORD")
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST")
RABBITMQ_PORT = os.getenv("RABBITMQ_PORT")
RABBITMQ_VHOST = os.getenv("RABBITMQ_VHOST")
RABBITMQ_TASK_QUEUE = os.getenv("RABBITMQ_TASK_QUEUE")

# Ignore all future warnings
simplefilter(action="ignore", category=FutureWarning)

# Celery broker URL
CELERY_BROKER_URL = (
    f"amqp://"
    f"{RABBITMQ_USERNAME}:"
    f"{RABBITMQ_PASSWORD}@"
    f"{RABBITMQ_HOST}:{RABBITMQ_PORT}/"
    f"{RABBITMQ_VHOST}"
)

# Celery app initialization
queue = Queue(RABBITMQ_TASK_QUEUE, Exchange(RABBITMQ_TASK_QUEUE), RABBITMQ_TASK_QUEUE)
app = Celery("tasks", backend="rpc://", broker=CELERY_BROKER_URL)

app.conf.update(
    task_serializer="pickle",
    accept_content=["pickle", "json"],  # Ignore other content
    result_serializer="pickle",
    task_queues=[queue],
    worker_concurrency=4,
    worker_max_memory_per_child=4000000,
    worker_pool="solo",
)

################################################################################
# Note tasks
################################################################################
@app.task
def vectorize_note(*args, database: str, note_id: str, **kwargs) -> ObjectId:
    db = utils.connect(db=database)
    note_id = ObjectId(str(note_id))

    # log action to stdout
    logging.info(f"Updating note {note_id} for" f"database {database}.")
    # ---------------------------------------------------------------------------

    note = db.notes.find_one({"_id": note_id})
    if note:
        app.send_task(
            "backend.graph.update_vectors",  # Task name
            args=[database, [note]],  # Replace with actual arguments
            kwargs={},
            queue="graph",
        )
    else:
        raise Exception(f"Can't find note for {note_id}.")


################################################################################
# Graph tasks
################################################################################
@app.task
def update_nodes(*args, database: str, node_uids: List[str], **kwargs):
    app.send_task(
        "backend.graph.update_nodes",
        args=[],
        kwargs={"database": database, "node_uids": node_uids},
        queue="graph",
    )

################################################################################
# Vector tasks
################################################################################
@app.task
def acknowledge_vector_upload(*args, database: str, ids: List[str], **kwargs):
    db = utils.connect(db=database)
    oids = [ObjectId(id) for id in ids]
    db.documents.update_many({"_id": {"$in": oids}}, {
        "$set": {
             "state.vectorized": True  
        }
    })
    logging.info(f"Acknowledged {len(ids)} vectorized and uploaded to database {database}.")


################################################################################
# Storage tasks
################################################################################
@app.task
def delete_storage(*args, database: str, userid: str, workspace: str, storage: str):
    workspace = ObjectId(str(workspace))
    storage = ObjectId(str(storage))
    db = utils.connect(db=database)
    storage_item = db.storage.find_one({"_id": storage})
    ids = [str(doc) for doc in storage_item["docs"]]
    
    app.send_task(
        "backend.graph.delete_vectors",
        args=[],
        kwargs={"database": database, "ids": ids},
        queue="graph",
    )

    db.storage.delete_one({"_id": storage})
    db.workspaces.update_one({"_id": workspace}, {
        "$pull": {
            "storage": storage
        }
    })
    db.groups.update_many({},{
        "$pull": {
            "$in": storage_item["docs"]
        }
    })
    db.documents.delete_many({"_id": {"$in": storage_item["docs"]}})
    logging.info(f"Deleted all documents from {storage} in database {database} and workspace {workspace}.")




@app.task
def chunk_upload(*args, database: str, userid: str, workspace: str, label: str, data):
    try:
        workspace = ObjectId(str(workspace))
        db = utils.connect(db=database)
        documents = []

        # Validate incoming data
        rows = [row["values"] for row in data.get("rows", [])]
        for row in rows:
            if "text" not in row:
                logging.error(f"Row missing required fields: {row}")
                continue

            if "title" not in row:
                row["title"] = utils.truncate_string(row["text"], 40)

            metadata = {k: v for k, v in row.items() if k not in {"text", "title"}}

            document = {
                "text": row["text"],
                "title": row["title"],
                "relationships": {},
                "metadata": json.loads(json.dumps(metadata)),  # Convert row to JSON
                "state": {"read": False},
            }
            documents.append(document)

        if not documents:
            logging.warning("No valid documents to insert.")
            return

        inserted_ids = db.documents.insert_many(documents).inserted_ids
        logging.info(f"Inserted {len(inserted_ids)} documents.")

        query = {"label": label}  # The condition to match the document
        update = {
            "$addToSet": {"docs": {"$each": inserted_ids}},
            "$setOnInsert": {
                "label": label,
                "size": 0,
            },
        }

        # Perform the update or insert operation
        storage_result = db.storage.update_one(query, update, upsert=True)
        storage_id = storage_result.upserted_id if storage_result.upserted_id is not None else db.storage.find_one(query)["_id"]

        db.workspaces.update_one({"_id": workspace}, {
            "$addToSet": {
                "storage": storage_id
            }
        })


        app.send_task(
            "backend.graph.milvus_chunk_import",
            args=[],
            kwargs={
                "database": database,
                "userid": userid,
                "documents": inserted_ids,
            },
            queue="graph",
        )

        # Extract unique group names from rows
        groups = {row.get("group") for row in rows if "group" in row}

        # Create a dictionary to store document IDs for each group
        group_docs = {group: [] for group in groups}
        for row, doc_id in zip(rows, inserted_ids):
            if "group" in row:
                group_docs[row["group"]].append(ObjectId(doc_id))

        # Prepare bulk operations
        group_bulk_operations = []
        for group in groups:
            filter = {"label": group, "workspace": workspace}
            ensure_group = {
                "$setOnInsert": {
                    "label": group,
                    "color": utils.random_color(),
                    "workspace": workspace,
                    "docs": [],  # Initialize 'docs' as an empty array if the document is new
                },
            }
            group_bulk_operations.append(UpdateOne(filter, ensure_group, upsert=True))

        # Execute bulk operations
        if group_bulk_operations:
            db.groups.bulk_write(group_bulk_operations)
            logging.info(f"Updated {len(group_bulk_operations)} groups.")

        # Prepare bulk operations
        doc_bulk_operations = []
        for group in groups:
            filter = {"label": group, "workspace": workspace}
            add_docs = {
                "$addToSet": {
                    "docs": {
                        "$each": group_docs[group]
                    }  # Add documents to the 'docs' array
                }
            }
            doc_bulk_operations.append(UpdateOne(filter, add_docs, upsert=True))

        # Execute bulk operations
        if doc_bulk_operations:
            db.groups.bulk_write(doc_bulk_operations)
            logging.info(f"Updated {len(doc_bulk_operations)} doc sets in groups.")

    except Exception as e:
        logging.error(f"Error in chunk_upload: {e}")
        raise


if __name__ == "__main__":
    worker = app.Worker(
        include=["backend.tasks"],
        hostname=f"tasks.{os.getlogin()}@%h{uuid.uuid4()}",
        loglevel="INFO",
    )
    worker.start()
