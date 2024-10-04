# tasks.py
import logging
import json
import datetime
import uuid
import pandas as pd
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

DOWNLOAD_DIR = os.getenv("DOWNLOAD_DIR")

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
# Ping tasks
################################################################################
@app.task
def ping(*args, msg, **kwargs) -> ObjectId:
    logging.info(f"Message received: {msg}.")


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
def update_nodes(*args, database: str, node_uids: List[str], workspace_id: str, **kwargs):
    app.send_task(
        "backend.graph.update_nodes",
        args=[],
        kwargs={
            "database": database, 
            "node_uids": node_uids, 
            "workspace_id": workspace_id
        },
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
def generate_xlsx(*args, database: str, userid: str, workspace_id: str, group_ids: List[str], storage_ids: List[str]):
    db = utils.connect(db=database)

    # Optionally save to Excel (you can modify the path and filename)
    
    # Workspace information (assuming workspace is passed as a dict with 'id' and 'label')
    workspace = db.workspace.find({"_id": ObjectId(workspace_id)})
    workspace_label = workspace.get("label", "")
    
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{userid}_{workspace_label}_documents_{timestamp}.xlsx"

    file_result = db.files.insert_one({
        "filename": filename,
        "status": {
            "description": "Processing data...",
            "ready": False
        }
    })

    # Combine group_ids and storage_ids for the $match stage
    all_ids = [ObjectId(gid) for gid in group_ids] + [ObjectId(sid) for sid in storage_ids]

    # Create the aggregation pipeline
    pipeline = [
        # Step 1: Match the groups and storage based on the provided group_ids and storage_ids
        {
            "$match": {
                "_id": {"$in": all_ids}
            }
        },
        
        # Step 2: Lookup the documents in the 'documents' collection for both groups and storage
        {
            "$lookup": {
                "from": "documents",  # Join with the 'documents' collection
                "localField": "docs",  # Field in 'groups' and 'storage' (an array of ObjectIds in 'docs')
                "foreignField": "_id",  # Field in 'documents' (match based on the '_id' field)
                "as": "document_details"  # The output field for the matched documents
            }
        },

        # Step 3: Unwind the document details to create a row per document
        {"$unwind": "$document_details"},

        # Step 4: Project the necessary fields from groups, storage, and documents
        {
            "$project": {
                "document": "$document_details._id",  # The original document ID from documents
                "group": "$label",  # Group label from the group document (if exists)
                "storage": "$label",  # Storage label from the storage document (if exists)
                "text": "$document_details.text",  # The text field from the document
                "title": "$document_details.title",  # The title field from the document
                "workspace_id": {"$literal": workspace_id},  # Static workspace_id
                "workspace_label": {"$literal": workspace_label},  # Static workspace_label
                "metadata": "$document_details.metadata"  # Arbitrary metadata from the document
            }
        }
    ]

    # Execute the aggregation pipeline
    document_cursor = db.groups.aggregate(pipeline)

    # Convert the results to a list of dictionaries to use for the DataFrame
    data = list(document_cursor)

    # Convert the list to a pandas DataFrame
    df = pd.DataFrame(data)

    # Dynamically add metadata fields to the DataFrame
    if not df.empty:
        metadata_cols = df['metadata'].apply(pd.Series)
        df = pd.concat([df.drop(['metadata'], axis=1), metadata_cols], axis=1)

    
    file_path = os.path.join(DOWNLOAD_DIR, filename)

    # Save the DataFrame to Excel
    df.to_excel(file_path, index=False)

    db.files.update_one({"_id": file_result.inserted_id}, 
                        {
                            "status": {
                                "description": "The file is ready.",
                                "ready": True
                            }
                        })

    return df  # Return or save the DataFrame as needed



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
                "workspace": workspace,
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
                "workspace": workspace,
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
