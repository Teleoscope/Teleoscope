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
    global db, user, session, documents, group
    
    # connect to database
    db = utils.connect(db="test")

    # add a user which also creates a session
    userid = tasks.register_account(database="test", password="password", username="test")
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
    documents = list(db.documents.find({}).limit(3))

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
# Setup tests
###############################################################################



