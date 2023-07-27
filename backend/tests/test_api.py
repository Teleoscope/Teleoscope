import datetime
import pytest
import logging
import bcrypt
import string
import random

# local files
from .. import utils
from .. import tasks
from .. import schemas

users_db = None
db = None
user = None
contributor = None
workspace = None
workflow = None
workflow2 = None
documents = []
group = None
search = None
note = None

@pytest.fixture(scope="session", autouse=True)
def setup_before_tests():
    global current_time, users_db, db, user, contributor, workspace, workflow, workflow2, documents, group, search, note
    current_time = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S.%f")
    
    # connect to databases
    users_db = utils.connect(db="users")
    db = utils.connect(db="test")

    # add a user
    password = bcrypt.hashpw(b"password", bcrypt.gensalt(10))
    userid = tasks.register_account(password=password, username=f"user{current_time}")
    contributorid = tasks.register_account(password=password, username=f"contributor{current_time}")
    
    user = users_db.users.find_one(userid)
    contributor = users_db.users.find_one(contributorid)

    # add a workspace which also initializes a workflow
    workspace_id = tasks.initialize_workspace(userid=userid, label=f"test{current_time}", datasource="test")
    workspace = users_db.workspaces.find_one(workspace_id)

    workflow_id = workspace["workflows"][0]
    workflow = db.sessions.find_one({"_id": workflow_id})

    workflow2_id = tasks.initialize_workflow(
        database="test", 
        userid=userid, 
        label="2nd", 
        color="#FFFFFF", 
        workspace_id=workspace_id
    )
    workflow2 = db.sessions.find_one({"_id": workflow2_id})

    # create an empty group
    groupid = tasks.add_group(
        database="test",
        userid=userid,
        workflow_id=workflow_id,
        description=f"Test group {current_time}.",
        label="Test group",
        color="#FF0000",
        documents=[]
    )
    
    # grab some arbitrary documents
    documents = list(db.documents.aggregate([{ "$sample": { "size": 3 } }]))

    for document in documents:
        tasks.add_document_to_group(
            database="test",
            userid=userid,
            group_id=groupid,
            document_id=document["_id"]
        )

    group = db.groups.find_one({"_id": groupid})

    # make a search
    searchid = tasks.add_search(
        database="test",
        userid=userid,
        workflow_id=workflow_id,
        query="helper"
    )

    search = db.searches.find_one(searchid)

    note_id = tasks.add_note(
        database="test",
        userid=userid,
        workflow_id=workflow_id,
        label=f"note{current_time}",
        content=schemas.create_note_content(),
    )
    note = db.notes.find_one(note_id)


###############################################################################
# Setup tests
###############################################################################

def test_db():
    global db
    assert db != None


def test_workspace():
    global workspace
    assert workspace != None


def test_workflow():
    global workflow
    assert workflow != None


def test_documents():
    assert len(documents) > 0


def test_add_group():
    global group
    assert group != None


def test_add_documents_to_group():
    global group
    assert len(group["history"][0]["included_documents"]) > 0


def test_add_search():
    global search
    assert search != None


def test_add_note():
    global note
    assert note != None


###############################################################################
# Mutation tests
###############################################################################

def test_add_item():
    uid = ''.join(random.choice(string.ascii_lowercase) for i in range(10))
    res = tasks.add_item(
        database="test", 
        userid=user["_id"], 
        replyTo="test",
        workflow_id=workflow["_id"], 
        uid=uid, 
        node_type="Group", 
        oid=group["_id"]
    )
    assert res != None

def test_add_contributor():
    res = tasks.add_contributor(
        workspace_id=workspace["_id"], 
        userid=user["_id"], 
        contributor=contributor["username"]
    )
    assert res != None
    

def test_update_search():
    tasks.update_search(
        database="test", 
        userid=user["_id"], 
        workflow_id=workflow["_id"], 
        search_id=search["_id"], 
        query="test2"
    )
    updated_search = db.searches.find_one({"_id": search["_id"]})
    assert updated_search["history"][0]["query"] == "test2"


def test_save_UI_state():
    res = tasks.save_UI_state(
        database="test", 
        workflow_id=workflow["_id"],
        userid=user["_id"],
        bookmarks=[],
        nodes=[],
        edges=[]
    )
    assert res != None


def test_recolor_workflow():
    tasks.recolor_workflow(
        database="test",
        workflow_id=workflow["_id"],
        userid=user["_id"],
        color="#FFDDEE"
    )


def test_recolor_group():
    tasks.recolor_group(
        database="test",
        workflow_id=workflow["_id"],
        userid=user["_id"],
        group_id=group["_id"],
        color="#FEDFEF"
    )


def test_relabel_group():
    tasks.relabel_group(
        database="test",
        workflow_id=workflow["_id"],
        userid=user["_id"],
        group_id=group["_id"],
        label="New label"
    )


def test_relabel_workflow():
    tasks.relabel_workflow(
        database="test",
        workflow_id=workflow["_id"],
        userid=user["_id"],
        label="New label",
        relabeled_workflow_id=workflow2["_id"]
    )

def test_copy_group():
    tasks.copy_group(
        database="test",
        workflow_id=workflow["_id"],
        userid=user["_id"],
        group_id=group["_id"],
        label="copied group"
    )


def test_update_note():
    tasks.update_note(
        database="test",
        workflow_id=workflow["_id"],
        userid=user["_id"],
        note_id=note["_id"],
        content=schemas.create_note_content()
    )


def test_relabel_note():
    tasks.relabel_note(
        database="test",
        workflow_id=workflow["_id"],
        userid=user["_id"],
        note_id=note["_id"],
        label="New label"
    )


def test_remove_contributor():
    tasks.remove_contributor(
        database="test",
        workspace_id=workspace["_id"],
        workflow_id=workflow["_id"],
        userid=user["_id"],
        contributor_id=contributor["_id"]
    )


def test_remove_document_from_group():
    tasks.remove_document_from_group(
        database="test",
        workflow_id=workflow["_id"],
        userid=user["_id"],
        document_id=documents[0]["_id"],
        group_id=group["_id"]
    )


def test_remove_group():
    tasks.remove_group(
        database="test",
        workflow_id=workflow["_id"],
        userid=user["_id"],
        group_id=group["_id"]
    )


def test_remove_note():
    tasks.remove_note(
        database="test",
        workflow_id=workflow["_id"],
        userid=user["_id"],
        note_id=note["_id"]
    )


def test_remove_workflow():
    tasks.remove_workflow(
        database="test",
        workspace_id=workspace["_id"],
        workflow_id=workflow["_id"],
        userid=user["_id"]
    )
