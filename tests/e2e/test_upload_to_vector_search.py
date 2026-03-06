"""
E2E test: document upload -> vectorization -> vector search.

Flow:
  1. Publish chunk_upload to dispatch (same payload as POST /api/upload/csv/chunk).
  2. Wait for documents to be vectorized (MongoDB state.vectorized).
  3. Create a Rank node with one Group (control) containing one uploaded doc.
  4. Publish update_nodes so the graph worker runs vector search.
  5. Poll the Rank node until doclists are filled; assert ranked_documents.

Requires: MongoDB, RabbitMQ, and workers (dispatch, tasks, graph, vectorizer, uploader)
running with Milvus. Use pytest -m e2e when the stack is up.
"""
import json
import os
import time
import uuid

import pytest
from bson.objectid import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi

load_dotenv()

# Skip entire module if stack not configured
pytestmark = pytest.mark.e2e

MONGODB_URI = os.environ.get("MONGODB_URI")
RABBITMQ_DISPATCH_QUEUE = os.environ.get("RABBITMQ_DISPATCH_QUEUE")
RABBITMQ_TASK_QUEUE = os.environ.get("RABBITMQ_TASK_QUEUE")


def _publish(queue: str, payload: dict) -> None:
    import pika
    host = os.environ.get("RABBITMQ_HOST", "localhost")
    port = int(os.environ.get("RABBITMQ_PORT", "5672"))
    user = os.environ.get("RABBITMQ_USERNAME", "guest")
    password = os.environ.get("RABBITMQ_PASSWORD", "guest")
    vhost = os.environ.get("RABBITMQ_VHOST", "/")
    params = pika.ConnectionParameters(
        host=host, port=port, credentials=pika.PlainCredentials(user, password), virtual_host=vhost
    )
    conn = pika.BlockingConnection(params)
    try:
        ch = conn.channel()
        ch.queue_declare(queue=queue, durable=True)
        ch.basic_publish(
            exchange="",
            routing_key=queue,
            body=payload if isinstance(payload, str) else json.dumps(payload),
            properties=pika.BasicProperties(delivery_mode=2),
        )
    finally:
        conn.close()


@pytest.fixture(scope="module")
def db_name():
    return os.environ.get("MONGODB_DATABASE", "test_e2e")


@pytest.fixture(scope="module")
def client():
    if not MONGODB_URI:
        pytest.skip("MONGODB_URI not set")
    try:
        c = MongoClient(
            MONGODB_URI,
            server_api=ServerApi("1"),
            serverSelectionTimeoutMS=3000,
        )
        c.admin.command("ping")
    except Exception as e:
        pytest.skip(f"MongoDB not reachable: {e}")
    yield c
    c.close()


@pytest.fixture(scope="module")
def test_data(client, db_name):
    """Create test user, team, workspace, workflow; return ids."""
    db = client[db_name]
    user_id = ObjectId()
    team_id = ObjectId()
    workspace_id = ObjectId()
    workflow_id = ObjectId()

    db.users.insert_one({
        "_id": user_id,
        "emails": ["e2e@test.teleoscope"],
        "name": "E2E User",
    })
    db.teams.insert_one({
        "_id": team_id,
        "owner": user_id,
        "label": "E2E Team",
    })
    db.workspaces.insert_one({
        "_id": workspace_id,
        "team": team_id,
        "workflows": [workflow_id],
        "storage": [],
    })
    db.workflows.insert_one({
        "_id": workflow_id,
        "label": "E2E Workflow",
    })

    yield {
        "userid": str(user_id),
        "workspace": str(workspace_id),
        "workflow_id": str(workflow_id),
        "workspace_id": str(workspace_id),
    }

    # Teardown: drop test db so we don't leak
    client.drop_database(db_name)


def test_upload_chunk_to_vector_search(client, db_name, test_data):
    if not RABBITMQ_DISPATCH_QUEUE or not RABBITMQ_TASK_QUEUE:
        pytest.skip("RABBITMQ_DISPATCH_QUEUE / RABBITMQ_TASK_QUEUE not set")

    # Ensure backend.utils is importable and has correct env
    from backend import utils
    db = client[db_name]

    # 1. Publish chunk_upload (same shape as Next.js API)
    doc_texts = ["First document for vector search.", "Second document for ranking."]
    rows = [{"values": {"text": t, "title": t[:30]}} for t in doc_texts]
    msg = {
        "task": "chunk_upload",
        "args": [],
        "kwargs": {
            "database": db_name,
            "userid": test_data["userid"],
            "workspace": test_data["workspace"],
            "data": {"rows": rows},
            "label": "e2e_upload",
        },
    }
    _publish(RABBITMQ_DISPATCH_QUEUE, msg)

    # 2. Wait for documents to appear and be vectorized (up to 120s)
    inserted_ids = []
    for _ in range(120):
        docs = list(db.documents.find({"workspace": ObjectId(test_data["workspace"])}))
        if len(docs) >= 2:
            inserted_ids = [str(d["_id"]) for d in docs]
            # Wait for vectorized flag (set by acknowledge_vector_upload)
            vectorized = all(d.get("state", {}).get("vectorized") for d in docs)
            if vectorized:
                break
        time.sleep(1)
    assert len(inserted_ids) >= 2, "Expected at least 2 documents; vectorization may not have completed"

    # 3. Create Group (one doc) and Rank node; connect Group as control to Rank
    group_uid = f"e2e-group-{uuid.uuid4().hex[:8]}"
    rank_uid = f"e2e-rank-{uuid.uuid4().hex[:8]}"

    group_doc = db.groups.insert_one({
        "label": "e2e_control",
        "workspace": ObjectId(test_data["workspace"]),
        "docs": [ObjectId(inserted_ids[0])],
        "color": "#000000",
    })
    db.graph.insert_one({
        "uid": group_uid,
        "type": "Group",
        "reference": group_doc.inserted_id,
        "workflow": ObjectId(test_data["workflow_id"]),
        "workspace": ObjectId(test_data["workspace"]),
        "status": "",
        "doclists": [],
        "parameters": {},
        "edges": {"source": [], "control": [], "output": []},
    })
    db.graph.insert_one({
        "uid": rank_uid,
        "type": "Rank",
        "reference": None,
        "workflow": ObjectId(test_data["workflow_id"]),
        "workspace": ObjectId(test_data["workspace"]),
        "status": "",
        "doclists": [],
        "parameters": {"distance": 0.5},
        "edges": {"source": [], "control": [group_uid], "output": []},
    })

    # 4. Trigger update_nodes for the Rank (same as POST /api/graph/update)
    update_msg = {
        "task": "update_nodes",
        "args": [],
        "kwargs": {
            "database": db_name,
            "workflow_id": test_data["workflow_id"],
            "workspace_id": test_data["workspace_id"],
            "node_uids": [rank_uid],
        },
    }
    _publish(RABBITMQ_DISPATCH_QUEUE, update_msg)

    # 5. Poll Rank node until doclists populated
    rank_node = None
    for _ in range(60):
        rank_node = db.graph.find_one({"uid": rank_uid})
        if rank_node and rank_node.get("doclists") and len(rank_node["doclists"]) > 0:
            break
        time.sleep(1)
    assert rank_node is not None, "Rank node not found"
    assert rank_node.get("doclists"), f"Rank node has no doclists: status={rank_node.get('status')}"
    ranked = rank_node["doclists"][0].get("ranked_documents", [])
    assert len(ranked) > 0, "Vector search returned no ranked documents"
