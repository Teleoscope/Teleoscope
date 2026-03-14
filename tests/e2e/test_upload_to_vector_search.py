"""
E2E test: document upload -> vectorization -> vector search.

Flow:
  1. Publish chunk_upload to dispatch (same payload as POST /api/upload/csv/chunk).
  2. Wait for documents to be vectorized (MongoDB state.vectorized).
  3. Create source/control groups from sample data and graph nodes for rank + set ops.
  4. Publish update_nodes so graph worker computes rank and boolean operations.
  5. Poll graph nodes and assert expected cardinalities.

Requires: MongoDB, RabbitMQ, and workers (dispatch, tasks, graph, vectorizer, uploader)
running with Milvus. Use pytest -m e2e when the stack is up.
"""
import json
import os
import time
import uuid
from pathlib import Path

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
E2E_SAMPLE_SIZE = int(os.environ.get("E2E_SAMPLE_SIZE", "10"))


def _sample_path(sample_size: int) -> Path:
    return Path(__file__).resolve().parents[2] / "data" / f"sample_{sample_size}.jsonl"


def _load_sample_rows(sample_size: int):
    path = _sample_path(sample_size)
    if not path.exists():
        pytest.skip(f"Sample data file not found: {path}")

    rows = []
    with path.open("r", encoding="utf-8") as handle:
        for index, line in enumerate(handle):
            payload = json.loads(line)
            rows.append(
                {
                    "values": {
                        "text": payload["text"],
                        "title": payload["title"],
                        "id": payload.get("id", f"sample-{sample_size}-{index + 1}"),
                        "group": "sample-group-a" if index % 2 == 0 else "sample-group-b",
                    }
                }
            )
    if len(rows) == 0:
        pytest.skip(f"No rows parsed from {path}")
    return rows


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
    """Create schema-compliant user/account/team/workspace/workflow test data."""
    db = client[db_name]
    user_id = f"e2e-user-{uuid.uuid4().hex[:16]}"
    account_id = ObjectId()
    team_id = ObjectId()
    workspace_id = ObjectId()
    workflow_id = ObjectId()
    user_email = f"{user_id}@test.teleoscope"

    db.users.insert_one({
        "_id": user_id,
        "emails": [user_email],
        "hashed_password": "e2e-not-a-real-hash",
    })
    db.accounts.insert_one({
        "_id": account_id,
        "users": {"owner": user_id},
        "plan": {
            "name": "E2E Test Plan",
            "note": "E2E temporary account plan",
            "plan_storage_amount": 1000,
            "plan_collaborator_amount": 10,
            "plan_team_amount": 10,
        },
        "resources": {
            "amount_storage_available": 1000,
            "amount_storage_used": 0,
            "amount_seats_available": 10,
            "amount_seats_used": 1,
            "amount_teams_available": 10,
            "amount_teams_used": 1,
        },
    })
    db.teams.insert_one({
        "_id": team_id,
        "account": account_id,
        "owner": user_id,
        "label": "E2E Team",
        "users": [],
        "workspaces": [workspace_id],
    })
    db.workspaces.insert_one({
        "_id": workspace_id,
        "label": "E2E Workspace",
        "team": team_id,
        "settings": {"document_width": 100, "document_height": 35, "expanded": False},
        "selected_workflow": workflow_id,
        "workflows": [workflow_id],
        "storage": [],
    })
    db.workflows.insert_one({
        "_id": workflow_id,
        "label": "E2E Workflow",
        "workspace": workspace_id,
        "last_update": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "logical_clock": 0,
        "nodes": [],
        "edges": [],
        "bookmarks": [],
        "selection": {"nodes": [], "edges": []},
        "settings": {"color": "#000000", "title_length": 40},
    })

    yield {
        "userid": str(user_id),
        "workspace": str(workspace_id),
        "workflow_id": str(workflow_id),
        "workspace_id": str(workspace_id),
    }

    # Teardown only e2e-created artifacts in shared DB.
    db.graph.delete_many({"workspace": workspace_id})
    db.groups.delete_many({"workspace": workspace_id})
    db.documents.delete_many({"workspace": workspace_id})
    db.storage.delete_many({"label": {"$regex": "^e2e_upload_sample_"}})
    db.workflows.delete_one({"_id": workflow_id})
    db.workspaces.delete_one({"_id": workspace_id})
    db.teams.delete_one({"_id": team_id})
    db.accounts.delete_one({"_id": account_id})
    db.users.delete_one({"_id": user_id})


def test_upload_chunk_to_vector_search(client, db_name, test_data):
    if not RABBITMQ_DISPATCH_QUEUE or not RABBITMQ_TASK_QUEUE:
        pytest.skip("RABBITMQ_DISPATCH_QUEUE / RABBITMQ_TASK_QUEUE not set")

    db = client[db_name]

    # 1. Publish chunk_upload (same shape as POST /api/upload/csv/chunk)
    rows = _load_sample_rows(E2E_SAMPLE_SIZE)
    msg = {
        "task": "chunk_upload",
        "args": [],
        "kwargs": {
            "database": db_name,
            "userid": test_data["userid"],
            "workspace": test_data["workspace"],
            "data": {"rows": rows},
            "label": f"e2e_upload_sample_{E2E_SAMPLE_SIZE}",
        },
    }
    _publish(RABBITMQ_DISPATCH_QUEUE, msg)

    # 2. Wait for documents to appear and be vectorized.
    inserted_ids = []
    for _ in range(420):
        docs = list(db.documents.find({"workspace": ObjectId(test_data["workspace"])}))
        if len(docs) >= E2E_SAMPLE_SIZE:
            inserted_ids = [str(d["_id"]) for d in docs]
            # Wait for vectorized flag (set by acknowledge_vector_upload)
            vectorized = all(d.get("state", {}).get("vectorized") for d in docs)
            if vectorized:
                break
        time.sleep(1)
    assert len(inserted_ids) >= E2E_SAMPLE_SIZE, (
        f"Expected at least {E2E_SAMPLE_SIZE} documents; vectorization may not have completed"
    )

    # 3. Create groups + rank and boolean operation nodes.
    split_idx = (len(inserted_ids) + 1) // 2
    source_ids = inserted_ids[:split_idx]
    control_ids = inserted_ids[split_idx:]

    source_group_uid = f"e2e-group-source-{uuid.uuid4().hex[:8]}"
    control_group_uid = f"e2e-group-control-{uuid.uuid4().hex[:8]}"
    rank_uid = f"e2e-rank-{uuid.uuid4().hex[:8]}"
    union_uid = f"e2e-union-{uuid.uuid4().hex[:8]}"
    intersection_uid = f"e2e-intersection-{uuid.uuid4().hex[:8]}"
    difference_uid = f"e2e-difference-{uuid.uuid4().hex[:8]}"
    exclusion_uid = f"e2e-exclusion-{uuid.uuid4().hex[:8]}"

    source_group = db.groups.insert_one({
        "label": "e2e_source_group",
        "workspace": ObjectId(test_data["workspace"]),
        "docs": [ObjectId(doc_id) for doc_id in source_ids],
        "color": "#000000",
    })
    control_group = db.groups.insert_one({
        "label": "e2e_control_group",
        "workspace": ObjectId(test_data["workspace"]),
        "docs": [ObjectId(doc_id) for doc_id in control_ids],
        "color": "#222222",
    })
    db.graph.insert_one({
        "uid": source_group_uid,
        "type": "Group",
        "reference": source_group.inserted_id,
        "workflow": ObjectId(test_data["workflow_id"]),
        "workspace": ObjectId(test_data["workspace"]),
        "status": "",
        "doclists": [],
        "parameters": {},
        "edges": {"source": [], "control": [], "output": []},
    })
    db.graph.insert_one({
        "uid": control_group_uid,
        "type": "Group",
        "reference": control_group.inserted_id,
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
        "edges": {"source": [source_group_uid], "control": [control_group_uid], "output": []},
    })
    for uid, typ in [
        (union_uid, "Union"),
        (intersection_uid, "Intersection"),
        (difference_uid, "Difference"),
        (exclusion_uid, "Exclusion"),
    ]:
        db.graph.insert_one({
            "uid": uid,
            "type": typ,
            "reference": None,
            "workflow": ObjectId(test_data["workflow_id"]),
            "workspace": ObjectId(test_data["workspace"]),
            "status": "",
            "doclists": [],
            "parameters": {},
            "edges": {"source": [source_group_uid], "control": [control_group_uid], "output": []},
        })

    # 4. Trigger update_nodes for all validation nodes.
    target_uids = [rank_uid, union_uid, intersection_uid, difference_uid, exclusion_uid]
    update_msg = {
        "task": "update_nodes",
        "args": [],
        "kwargs": {
            "database": db_name,
            "workflow_id": test_data["workflow_id"],
            "workspace_id": test_data["workspace_id"],
            "node_uids": target_uids,
        },
    }
    _publish(RABBITMQ_DISPATCH_QUEUE, update_msg)

    # 5. Poll rank node until doclists populated.
    rank_node = None
    for _ in range(240):
        rank_node = db.graph.find_one({"uid": rank_uid})
        if rank_node and rank_node.get("doclists") and len(rank_node["doclists"]) > 0:
            break
        time.sleep(1)
    assert rank_node is not None, "Rank node not found"
    assert rank_node.get("doclists"), f"Rank node has no doclists: status={rank_node.get('status')}"
    ranked = rank_node["doclists"][0].get("ranked_documents", [])
    assert len(ranked) > 0, "Vector rank returned no ranked documents"

    # 6. Poll boolean operation nodes and validate exact set cardinalities.
    expected_union = len(set(source_ids).union(set(control_ids)))
    expected_intersection = len(set(source_ids).intersection(set(control_ids)))
    expected_difference = len(set(source_ids).difference(set(control_ids)))
    expected_exclusion = len(set(source_ids).symmetric_difference(set(control_ids)))

    expected_by_uid = {
        union_uid: expected_union,
        intersection_uid: expected_intersection,
        difference_uid: expected_difference,
        exclusion_uid: expected_exclusion,
    }

    for uid, expected_size in expected_by_uid.items():
        node = None
        for _ in range(180):
            node = db.graph.find_one({"uid": uid})
            if node and node.get("doclists"):
                current_size = len(node["doclists"][0].get("ranked_documents", []))
                if current_size == expected_size:
                    break
            time.sleep(1)
        assert node is not None, f"Node {uid} not found"
        assert node.get("doclists"), f"Node {uid} has no doclists"
        actual_size = len(node["doclists"][0].get("ranked_documents", []))
        assert actual_size == expected_size, (
            f"{uid} expected {expected_size} docs but received {actual_size}"
        )
