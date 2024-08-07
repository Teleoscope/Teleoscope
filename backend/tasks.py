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
from pymongo.errors import OperationFailure, ConfigurationError


# Local imports
from . import utils

# Environment variables
from dotenv import load_dotenv

load_dotenv()

RABBITMQ_USERNAME = os.getenv("RABBITMQ_USERNAME")
RABBITMQ_PASSWORD = os.getenv("RABBITMQ_PASSWORD")
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST")
RABBITMQ_VHOST = os.getenv("RABBITMQ_VHOST")
RABBITMQ_TASK_QUEUE = os.getenv("RABBITMQ_TASK_QUEUE")

# Ignore all future warnings
simplefilter(action="ignore", category=FutureWarning)

# Celery broker URL
CELERY_BROKER_URL = (
    f"amqp://"
    f"{RABBITMQ_USERNAME}:"
    f"{RABBITMQ_PASSWORD}@"
    f"{RABBITMQ_HOST}/"
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
            "backend.graph.update_vectors",   # Task name
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
def update_nodes(
    *args, database: str, node_uids: List[str], **kwargs
):
    app.send_task(
            "backend.graph.update_nodes",
            args=[],
            kwargs={"database": database, "node_uids": node_uids},
            queue="graph",
    )

################################################################################
# Upload tasks
################################################################################
@app.task
def chunk_upload(*args, database: str, userid: str, workspace: str, data):
    workspace = ObjectId(str(workspace))
    db = utils.connect(db=database)
    documents = []
    rows = [row["values"] for row in data["rows"]]
    for row in rows:
        document = {
            "text": row["text"],
            "title": row["title"],
            "relationships": {},
            "metadata": json.loads(json.dumps(row)),  # Convert row to JSON
            "state": {"read": False},
        }
        documents.append(document)

    session = db.client.start_session()

    try:
        with session.start_transaction():
            inserted_ids = db.documents.insert_many(
                documents, session=session
            ).inserted_ids
            bulk_operations = []

            for row, doc_id in zip(rows, inserted_ids):
                if "group" in row:
                    filter = {"label": row["group"], "workspace": workspace}
                    ensure_group = {
                        "$setOnInsert": {
                            "label": row["group"],
                            "workspace": workspace,
                            "documents": [],
                        },
                    }
                    bulk_operations.append(UpdateOne(filter, ensure_group, upsert=True))
                    
                    add_doc = {"$addToSet": {"documents": ObjectId(doc_id)}}
                    bulk_operations.append(UpdateOne(filter, add_doc))

            if len(bulk_operations) > 0:
                result = db.groups.bulk_write(bulk_operations, session=session)
                print(
                    f"Inserted: {result.upserted_count}, Matched: {result.matched_count}"
                )

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

        session.commit_transaction()
    except (OperationFailure, ConfigurationError) as e:
        session.abort_transaction()
        print(f"Transaction aborted due to: {e}")
    finally:
        session.end_session()


if __name__ == "__main__":
    worker = app.Worker(
        include=["backend.tasks"],
        hostname=f"tasks.{os.getlogin()}@%h{uuid.uuid4()}",
        loglevel="INFO",
    )
    worker.start()
