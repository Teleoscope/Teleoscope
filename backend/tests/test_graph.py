import datetime
import pytest
import logging

# local files
from .. import utils
from .. import tasks
from .. import graph

current_time = None
db = None
user = None
workspace = None
workflow = None
documents = []
group = None

@pytest.fixture(scope="session", autouse=True)
def setup_before_tests():
    global current_time, db, user, workspace, workflow, documents, group
    current_time = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S.%f")
    
    # connect to databases
    users_db = utils.connect(db="users")
    db = utils.connect(db="test")

    # add a user
    userid = tasks.register_account(password="password", username=f"test{current_time}")
    user = users_db.users.find_one(userid)

    # add a workspace which also initializes a workflow
    workspace_id = tasks.initialize_workspace(userid=userid, label=f"test{current_time}", datasource="test")
    workspace = users_db.workspaces.find_one(workspace_id)

    workflow_id = workspace["workflows"][0]
    workflow = db.sessions.find_one({"_id": workflow_id})

    # create an empty group
    groupid = tasks.add_group(
        database="test",
        userid=userid,
        session_id=workflow_id,
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

###############################################################################
# Make node tests
###############################################################################

def test_make_node_document():
    global db, documents
    document_id = documents[0]["_id"]
    
    # make a new node from a document
    node = graph.make_node(db, document_id, "Document")
    assert node != None
    logging.info(f"Node is: {node}.")
    
    # document should have a node field matching above
    doc = db.documents.find_one({"_id": document_id})

    assert "node" in doc
    assert doc["node"] == node["_id"]


def test_make_node_group():
    global db, group
    groupid = group["_id"]

    # make a new node from a group
    node = graph.make_node(db, groupid, "Group")
    assert node != None

    # group should have a node field matching above
    g = db.groups.find_one({"_id": groupid})

    assert "node" in g
    assert g["node"] == node["_id"]


def test_make_node_teleoscope():
    global db
    node = graph.make_node(db, None, "Teleoscope")
    assert node != None


def test_make_node_union():
    global db
    node = graph.make_node(db, None, "Union")
    assert node != None


def test_make_node_intersection():
    global db
    node = graph.make_node(db, None, "Intersection")
    assert node != None


def test_make_node_exclusion():
    global db
    node = graph.make_node(db, None, "Exclusion")
    assert node != None


def test_make_node_subtraction():
    global db
    node = graph.make_node(db, None, "Subtraction")
    assert node != None


###############################################################################
# Make edge tests
###############################################################################

def test_make_edge_document_teleoscope():
    global db, documents
    document_id = documents[0]["_id"]

    target_node = graph.make_node(db, None, "Teleoscope")

    graph.make_edge(
        db=db, 
        source_oid=document_id,
        source_type="Document",
        target_oid=target_node["_id"],
        target_type="Teleoscope",
        edge_type="control"
    )

    # Grab the nodes for the documents we just made
    document_updated = db.documents.find_one(document_id)
    source_node_updated = db.graph.find_one(document_updated["node"])
    target_node_updated = db.graph.find_one(target_node["_id"])

    logging.info(f"Target node updated {target_node_updated}.")

    # make sure the source contains a reference to the target
    updated_source_edges = source_node_updated["edges"]
    assert target_node["_id"] in [e["nodeid"] for e in updated_source_edges["output"]]
    
    # make sure the target contains a reference to the source
    updated_target_edges = target_node_updated["edges"]
    assert source_node_updated["_id"] in [e["nodeid"] for e in updated_target_edges["control"]]

    # make sure the document list is non-zero
    updated_target_docs = target_node_updated["doclists"]
    assert len(updated_target_docs) > 0

    
    


