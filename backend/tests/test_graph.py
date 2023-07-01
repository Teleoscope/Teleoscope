import datetime
import pytest

# local files
from .. import utils
from .. import tasks
from .. import graph

current_time = None
db = None
user = None
session = None
documents = []
group = None

@pytest.fixture(scope="session", autouse=True)
def setup_before_tests():
    global current_time, db, user, session, documents, group
    current_time = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S.%f")
    # connect to database
    db = utils.connect(db="test")

    # add a user which also creates a session
    userid = tasks.register_account(database="test", password="password", username=f"test{current_time}")
    user = db.users.find_one(userid)
    session_id = user["sessions"][0]
    session = db.sessions.find_one({"_id": session_id})

    # create an empy group
    groupid = tasks.add_group(
        database="test",
        userid=userid,
        session_id=session_id,
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


def test_session():
    global session
    assert session != None


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
    print("Node is: ", node)
    
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

    
    


