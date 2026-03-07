#!/usr/bin/env python3
"""Seed the database with a test user and workspace for development/testing.

Creates:
  - User: test@test.test / TestPassword123!
  - Account, Team, Workspace, Workflow (defaults)

Usage:
  PYTHONPATH=. python scripts/seed-test-data.py
  # or with custom URI:
  MONGODB_URI=mongodb://... python scripts/seed-test-data.py

Safe to run multiple times — skips if user already exists.
"""
import os
import sys
import csv
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from pymongo import MongoClient
from bson.objectid import ObjectId

MONGODB_URI = os.environ.get(
    "MONGODB_URI",
    "mongodb://teleoscope:teleoscope_dev_password@localhost:27017/teleoscope"
    "?directConnection=true&serverSelectionTimeoutMS=5000&authSource=admin"
)
MONGODB_DATABASE = os.environ.get("MONGODB_DATABASE", "teleoscope")

TEST_EMAIL = "test@test.test"
TEST_PASSWORD_HASH = (
    "$argon2id$v=19$m=19456,t=2,p=1$"
    "dGVzdHNhbHQxMjM0NQ$"
    "k8K0BQKMO6J2X0VGp2GXIQ8GJ/FNtx0E3x7P5MxVZeQ"
)


def seed():
    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DATABASE]

    existing = db.users.find_one({"emails": [TEST_EMAIL]})
    if existing:
        print(f"User {TEST_EMAIL} already exists (id={existing['_id']}). Skipping seed.")
        client.close()
        return

    user_id = str(ObjectId())
    team_id = ObjectId()
    workspace_id = ObjectId()
    workflow_id = ObjectId()

    # Ensure collections exist (with validation if not already present)
    collections = [c["name"] for c in db.list_collections()]
    for name in ["users", "accounts", "teams", "workspaces", "workflows", "sessions",
                  "documents", "groups", "graph", "notes", "storage"]:
        if name not in collections:
            db.create_collection(name)
            print(f"  Created collection: {name}")

    # User
    db.users.insert_one({
        "_id": user_id,
        "emails": [TEST_EMAIL],
        "hashed_password": TEST_PASSWORD_HASH,
    })
    print(f"  Created user: {TEST_EMAIL} (id={user_id})")

    # Account
    account_result = db.accounts.insert_one({
        "users": {"owner": user_id},
        "resources": {
            "amount_teams_available": 1,
            "amount_seats_available": 1,
            "amount_storage_available": 100,
            "amount_teams_used": 1,
            "amount_seats_used": 1,
            "amount_storage_used": 0,
        },
        "plan": {
            "name": "Default",
            "plan_team_amount": 1,
            "plan_collaborator_amount": 1,
            "plan_storage_amount": 100,
            "note": "Seeded test account.",
        },
    })

    # Team
    db.teams.insert_one({
        "_id": team_id,
        "owner": user_id,
        "label": "Test team",
        "account": account_result.inserted_id,
        "workspaces": [workspace_id],
        "users": [],
    })

    # Workspace
    db.workspaces.insert_one({
        "_id": workspace_id,
        "label": "Test workspace",
        "team": team_id,
        "workflows": [workflow_id],
        "settings": {"document_height": 35, "document_width": 100, "expanded": False},
        "storage": [],
        "selected_workflow": workflow_id,
    })

    # Workflow
    db.workflows.insert_one({
        "_id": workflow_id,
        "workspace": workspace_id,
        "label": "Test workflow",
        "nodes": [],
        "edges": [],
        "bookmarks": [],
        "selection": {"nodes": [], "edges": []},
        "settings": {"color": "#94a3b8", "title_length": 50},
        "last_update": "2024-01-01T00:00:00.000Z",
        "logical_clock": 100,
    })

    print(f"  Created team={team_id}, workspace={workspace_id}, workflow={workflow_id}")

    # Optionally seed sample documents from fixtures
    fixtures_dir = Path(__file__).resolve().parent.parent / "tests" / "fixtures"
    csv_path = fixtures_dir / "sample_documents.csv"
    if csv_path.exists():
        with open(csv_path) as f:
            reader = csv.DictReader(f)
            docs = []
            for row in reader:
                docs.append({
                    "title": row["title"],
                    "text": row["text"],
                    "workspace": workspace_id,
                    "state": {"vectorized": False},
                })
            if docs:
                result = db.documents.insert_many(docs)
                print(f"  Seeded {len(result.inserted_ids)} sample documents from {csv_path.name}")

    client.close()
    print("Seed complete.")


if __name__ == "__main__":
    seed()
