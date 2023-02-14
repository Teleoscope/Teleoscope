import logging, pickle, utils, json, auth, numpy as np
from warnings import simplefilter
from celery import Celery, Task, chain
from bson.objectid import ObjectId
from kombu import Consumer, Exchange, Queue
import datetime
import schemas
# ignore all future warnings
simplefilter(action='ignore', category=FutureWarning)

# url: "amqp://myuser:mypassword@localhost:5672/myvhost"
CELERY_BROKER_URL = (
    f'amqp://'
    f'{auth.rabbitmq["username"]}:'
    f'{auth.rabbitmq["password"]}@'
    f'{auth.rabbitmq["host"]}/'
    f'{auth.rabbitmq["vhost"]}'
)

queue = Queue(
    auth.rabbitmq["task_queue"],
    Exchange(auth.rabbitmq["task_queue"]),
    auth.rabbitmq["task_queue"])

app = Celery('tasks', backend='rpc://', broker=CELERY_BROKER_URL)
app.conf.update(
    task_serializer='pickle',
    accept_content=['pickle'],  # Ignore other content
    result_serializer='pickle',
    task_queues=[queue],
)

@app.task
def initialize_session(*args, **kwargs):
    """
    Adds a session to the sessions collection.
    
    kwargs: 
        userid: (string, Bson ObjectId format)
    """
    transaction_session, db = utils.create_transaction_session()
    
    # handle kwargs
    userid = kwargs["userid"]
    label = kwargs['label']
    color = kwargs['color']
    
    logging.info(f'Initializing sesssion for user {userid}.')
    # Check if user exists and throw error if not
    user = db.users.find_one({"_id": ObjectId(str(userid))})
    if user is None:
        logging.info(f'User {userid} does not exist.')
        raise Exception(f'User {userid} does not exist.')

    # Object to write for userlist
    userlist =  {
        "owner": ObjectId(str(user["_id"])),
        "contributors": []
    }

    obj = {
        "creation_time": datetime.datetime.utcnow(),
        "userlist": userlist,
        "history": [
            {
                "timestamp": datetime.datetime.utcnow(),
                "bookmarks": [],
                "windows": [],
                "groups": [],
                "clusters": [],
                "teleoscopes": [],
                "label": label,
                "color": color,
                "action": f"Initialize session",
                "user": userid,
            }
        ],
    }
    with transaction_session.start_transaction():
        result = db.sessions.insert_one(obj, session=transaction_session)
        db.users.update_one(
            {"_id": ObjectId(str(user["_id"]))},
            {
                "$push": {
                    "sessions": result.inserted_id
                }
            }, session=transaction_session)
        utils.commit_with_retry(transaction_session)
    return 200 # success

@app.task
def save_UI_state(*args, **kwargs):
    """
    Updates a session document in the sessions collection.
    kwargs: 
        session_id: (int, represents ObjectId in int)
        history_item: (Dict)
    """
    transaction_session, db = utils.create_transaction_session()
    
    session_id = ObjectId(str(kwargs["session_id"]))

    logging.info(f'Saving state for {session_id}.')

    # check if session id is valid, if not, raise exception
    session = db.sessions.find_one({"_id": session_id})
    if not session:
        logging.info(f"Session {session_id} not found.")
        raise Exception("Session not found")

    userid = kwargs["userid"]
    user = db.users.find_one({"_id": userid})
    user_id = user['_id']

    history_item = session["history"][0]
    history_item["bookmarks"] = kwargs["bookmarks"]
    history_item["windows"] =  kwargs["windows"]
    history_item["timestamp"] = datetime.datetime.utcnow()
    history_item["action"] = "Save UI state"
    history_item["user"] = user_id

    with transaction_session.start_transaction(): # When you do transaction, you want to do it inside this transaction session
        db.sessions.update_one({"_id": session_id},
            {
                '$push': {
                    "history": {
                        "$each": [history_item],
                        "$position": 0
                    }
                }
            }, session=transaction_session)
        utils.commit_with_retry(transaction_session)

    return 200 # success
# Create_child   
# transaction_session, db = utils.create_transaction_session() [DONE]
# document = db.documents.find_one({"_id": document_id}) [DONE]
# document["text"][s:e]
# Declare any fields that are necessary
# Need the vectorize function # Can write a test for this one -> check if it's actually working
# inserted_document = db.documents.insert_one( ... )
# inserted_document.insertedID
# id = insertedid
# update_one(…)
# Write a test to check if it's actually working (can insert a dummy document and delete it once it's done)
@app.task
def create_child(start_index, end_index, *args, **kwargs):
    transaction_session, db = utils.create_transaction_session()
    with transaction_session.start_transaction(): 
        document_id = kwargs["document_id"]
        document = db.documents.find_one({"_id": document_id})
        # session_id =  ObjectId(str(kwargs["session_id"]))
        child_text = document["text"][start_index:end_index] # Not sure how I should go about doing the parameter - need to use kwargs?
        child_title = document["title"] + " child"
        child_id = document["id"] + "#start_index" + "#end_index" 
        child_vector = vectorize_text([child_text])
        # child_parent = db.sessions.find_one({"_id": session_id})
        child_document = schemas.create_document_object(child_title, child_id, child_vector, child_text, document)
        # inserted_document = db.documents.insert_one({
        #     'title': child_title, 
        #     'id': child_id, 
        #     'text_vector': child_vector, 
        #     'text': child_text,
        #     'parent': document
        # }, session=transaction_session)
        inserted_document = db.documents.insert_one({child_document}, session=transaction_session)
        #TODO: Create schema of create_document_object and call that instead
        new_id = inserted_document.inserted_id
        #TODO: What do we have to return for this function

        utils.commit_with_retry(transaction_session)



@app.task
def add_user_to_session(*args, **kwargs):
    """
    Add new user to session's userlist. Provide read/write access.
    kwargs:
        userid: (string, BSON ObjectId format)
        contributor: (string, represent username of contributor to be added)
        session_id: (int, represents ObjectId in int)
    """
    transaction_session, db = utils.create_transaction_session()

    logging.info(f'Adding {kwargs["contributor"]} to {kwargs["session_id"]}.')

    # handle session id kwarg
    session_id = ObjectId(str(kwargs["session_id"]))
    session = db.sessions.find_one({"_id": session_id})

    # handle user kwarg
    uid = kwargs["userid"]
    user = db.users.find_one({"_id": ObjectId(str(uid))})
    user_id = "1"
    if user is not None:
        user_id = user['_id']

    # handle contributor kwarg
    contributor_uid = kwargs["contributor"]
    contributor = db.users.find_one({"_id": ObjectId(str(contributor_uid))})
    contributor_id = "1"
    if contributor is not None:
        contributor_id = contributor['_id']

    userlist = session["userlist"]

    # check if user has already been added
    if contributor_id in userlist:
        logging.info(f'User {contributor_id} is already on userlist')
        raise Exception(f'User {contributor_id} is already on userlist')

    # add contributor to session's userlist
    userlist["contributors"].append(contributor_id)

    history_item = session["history"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()
    history_item["action"] = f"Add {contributor_id} to userlist"
    history_item["user"] = user_id

    # update session with new userlist that includes contributor
    with transaction_session.start_transaction():
        db.sessions.update_one({"_id": session_id},
            {
                '$set': {
                    "userlist": userlist,
                },
                "$push": {
                    "history": {
                        "$each": [history_item],
                        "$position": 0
                    }
                }
            }, session=transaction_session)

        db.users.update_one(
            {"_id": contributor_id},
            {
                "$push": {
                    "sessions": session_id
                }
            }, session=transaction_session)

        utils.commit_with_retry(transaction_session)

    return 200 # success

@app.task
def initialize_teleoscope(*args, **kwargs):
    """
    initialize_teleoscope:
    Performs a text query on aita.documents text index.
    If the query string already exists in the teleoscopes collection, returns existing reddit_ids.
    Otherwise, adds the query to the teleoscopes collection and performs a text query the results of which are added to the
    teleoscopes collection and returned.
    
    kwargs:
        session_id: string
        label: string (optional)
    """
    transaction_session, db = utils.create_transaction_session()

    # handle kwargs
    session_id = kwargs["session_id"]
    label = "default"
    if "label" in kwargs:
        label = kwargs["label"]

    ret = None

    userid = kwargs["userid"]
    user = db.users.find_one({"_id": userid})
    user_id = "1"
    if user != None:
        user_id = user['_id']

    # create a new query document
    with transaction_session.start_transaction():
        teleoscope_result = db.teleoscopes.insert_one({
                "creation_time": datetime.datetime.utcnow(),
                "history": [
                    {
                        "timestamp": datetime.datetime.utcnow(),
                        "label": label,
                        "rank_slice": [],
                        "reddit_ids": [],
                        "positive_docs": [],
                        "negative_docs": [],
                        "stateVector": [],
                        "ranked_document_ids": None,
                        "action": "Initialize Teleoscope",
                        "user": user_id,
                    }
                ]
            }, session=transaction_session)
        logging.info(f"New teleoscope id: {teleoscope_result.inserted_id}.")
  
        ui_session = db.sessions.find_one({'_id': ObjectId(str(session_id))})
        history_item = ui_session["history"][0]
        history_item["timestamp"] = datetime.datetime.utcnow()
        history_item["teleoscopes"].append(ObjectId(teleoscope_result.inserted_id))
        history_item["action"] = "Initialize Teleoscope"
        history_item["user"] = user_id

        # associate the newly created teleoscope with correct session

        db.sessions.update_one({"_id": ObjectId(str(session_id))},
            {
                '$push': {
                    "history": {
                        "$each": [history_item],
                        "$position": 0
                    }
                }
            }, session=transaction_session)
        utils.commit_with_retry(transaction_session)
    return teleoscope_result


@app.task
def save_teleoscope_state(*args, **kwargs):
    """
    Save the current state of a teleoscope.
    
    input:
        _id (int, represents ObjectId for a teleoscope)
        history_item (Dict)
    """
    session, db = utils.create_transaction_session()

    # handle args
    history_item = args[0]["history_item"]
    _id = str(args[0]["_id"])

    logging.info(f'Saving state for teleoscope {_id}.')
    obj_id = ObjectId(_id)

    # check if teleoscope id is valid, if not, raise exception
    if not db.teleoscopes.find_one({"_id": obj_id}):
        logging.info(f"Teleoscope {_id} not found.")
        raise Exception("Teleoscope not found")

    history_item["timestamp"] = datetime.datetime.utcnow()
    history_item["action"] = "Save Teleoscope state"

    with session.start_transaction():
        result = db.teleoscopes.update_one({"_id": obj_id},
            {
                '$push': {
                    "history": {
                        "$each": [history_item],
                        "$position": 0
                    }
                }
            }, session=session)
        logging.info(f'Saving teleoscope state: {result}')
        utils.commit_with_retry(session)

@app.task 
def add_group(*args, human=True, included_documents=[], **kwargs):
    """
    Adds a group to the group collection and links newly created group to corresponding session.
    
    kwargs: 
        label: (string, arbitrary)
        color: (string, hex color)
        session_id: (int, represents ObjectId in int)
    """
    transaction_session, db = utils.create_transaction_session()

    # handle kwargs
    color = kwargs["color"]
    label = kwargs["label"]
    _id = ObjectId(str(kwargs["session_id"]))
    userid = kwargs["userid"]
    
    user = db.users.find_one({"_id": ObjectId(str(userid))})
    user_id = "1"
    if user != None:
        user_id = user['_id']

    teleoscope_result = initialize_teleoscope(userid=userid, session_id=_id, label=label)

    # Creating document to be inserted into mongoDB
    obj = {
        "creation_time": datetime.datetime.utcnow(),
        "teleoscope": teleoscope_result.inserted_id,
        "history": [
            {
                "timestamp": datetime.datetime.utcnow(),
                "color": color,
                "included_documents": included_documents,
                "label": label,
                "action": "Initialize group",
                "user": user_id,
            }]
    }
    
    # call needs to be transactional due to groups & sessions collections being updated

    collection = db.groups
    if not human:
        collection = db.clusters

    with transaction_session.start_transaction():
        groups_res = collection.insert_one(obj, session=transaction_session)
        logging.info(f"Added group {obj['history'][0]['label']} with result {groups_res}.")
        # add created groups document to the correct session
        session = db.sessions.find_one({'_id': _id}, session=transaction_session)
        if not session:
            logging.info(f"Warning: session with id {_id} not found.")
            raise Exception(f"session with id {_id} not found")
        clusters = session["history"][0]["clusters"]
        groups = session["history"][0]["groups"]

        if human:
            groups.append(groups_res.inserted_id)
        else:
            clusters.append(groups_res.inserted_id)

        history_item = session["history"][0]
        history_item["timestamp"] = datetime.datetime.utcnow()
        history_item["groups"] = groups
        history_item["clusters"] = clusters
        history_item["action"] = f"Initialize new group: {label}"
        history_item["user"] = user_id

        sessions_res = db.sessions.update_one({'_id': _id},
            {
                '$push': {
                            "history": {
                                '$each': [history_item],
                                '$position': 0
                            }
                }
            }, session=transaction_session)
        logging.info(f"Associated group {obj['history'][0]['label']} with session {_id} and result {sessions_res}.")
        utils.commit_with_retry(transaction_session)

        if len(included_documents) > 0:
            logging.info(f'Reorienting teleoscope {teleoscope_result.inserted_id} for group {label}.')
            res = chain(
                    robj.s(teleoscope_id=teleoscope_result.inserted_id,
                        positive_docs=included_documents,
                        negative_docs=[]).set(queue=auth.rabbitmq["task_queue"]),
                    save_teleoscope_state.s().set(queue=auth.rabbitmq["task_queue"])
            )
            res.apply_async()
        
        return groups_res.inserted_id

@app.task
def copy_group(*args, **kwargs):
    """
    copies a group

    kwargs:
        userid: (int, represents ObjectId for a group)
        label: (string, arbitrary)
        session_id:  (int, represent ObjectId for current session)
        group_id: (int, represent ObjectId for a group to be copies(
    """
    transaction_session, db = utils.create_transaction_session()

    # handle kwargs
    userid = kwargs["userid"]
    user = db.users.find_one({"_id": ObjectId(str(userid))})
    user_id = "1"
    if user != None:
        user_id = user['_id']

    label = kwargs["label"]

    session_id_str = kwargs["session_id"]
    session_id = ObjectId(str(session_id_str))
    session = db.sessions.find_one({"_id": session_id})

    group_id = ObjectId(kwargs["group_id"])
    group_to_copy = db.groups.find_one({'_id': group_id})
    group_copy_history = group_to_copy["history"][0]
    color = group_copy_history["color"]
    included_documents = group_copy_history["included_documents"]

    print(f'Copying ({group_id}) as new group named: {label}')

    # create a new group for the session
    group_new_id = add_group(userid=userid, label=label, color=color, session_id=session_id_str)
    logging.info(f'Add new group ({group_new_id})')

    group_new = db.groups.find_one({'_id': group_new_id})

    # copy over appropriate data from group to be copied
    group_new_history = group_new["history"][0]
    group_new_history["timestamp"] = datetime.datetime.utcnow()
    group_new_history["included_documents"] = included_documents
    group_new_history["action"] = f"Copying group ({group_id}) data"
    group_new_history["user"] = user_id

    with transaction_session.start_transaction():
        db.groups.update_one({'_id': group_new_id}, {
                "$push":
                    {
                        "history": {
                            "$each": [group_new_history],
                            "$position": 0
                        }
                    }
                }, session=transaction_session)
        utils.commit_with_retry(transaction_session)

    res = chain(
                robj.s(teleoscope_id=str(group_new["teleoscope"]),
                       positive_docs=included_documents,
                       negative_docs=[]).set(queue=auth.rabbitmq["task_queue"]),
                save_teleoscope_state.s().set(queue=auth.rabbitmq["task_queue"])
    )
    res.apply_async()

    logging.info(f'Update new group data')

    return None


@app.task
def add_document_to_group(*args, **kwargs):
    """
    Adds a document_id to a group.

    kwargs:
        group_id: (int, represents ObjectId for a group)
        document_id: (string, arbitrary)
    """
    session, db = utils.create_transaction_session()

    # handle kwargs
    group_id = ObjectId(kwargs["group_id"])
    document_id = kwargs["document_id"]

    group = db.groups.find_one({'_id': group_id})
    # Check if group exists
    if not group:
        logging.info(f"Warning: group with id {group_id} not found.")
        raise Exception(f"group with id {group_id} not found")

    # check if document has already been added
    if document_id in group:
        logging.info(f'Document {document_id} is already in group')
        raise Exception(f'Document {document_id} is already in group')

    history_item = group["history"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()
    if document_id in history_item["included_documents"]:
        logging.info(f'Document {document_id} already in group {group["history"][0]["label"]}.')
        return
    history_item["included_documents"].append(document_id)
    history_item["action"] = "Add document to group"

    with session.start_transaction():
        db.groups.update_one({'_id': group_id}, {
                "$push":
                    {
                        "history": {
                            "$each": [history_item],
                            "$position": 0
                        }
                    }
                }, session=session)
        utils.commit_with_retry(session)
    logging.info(f'Reorienting teleoscope {group["teleoscope"]} for group {group["history"][0]["label"]} for document {document_id}.')
    res = chain(
                robj.s(teleoscope_id=group["teleoscope"],
                       positive_docs=[document_id],
                       negative_docs=[]).set(queue=auth.rabbitmq["task_queue"]),
                save_teleoscope_state.s().set(queue=auth.rabbitmq["task_queue"])
    )
    res.apply_async()
    return None

@app.task
def remove_document_from_group(*args, **kwargs):
    """
    Remove the document_id from the included_documents of the specified group_id.

    kwargs:
        group_id (int, represents ObjectId for a group)
        document_id (string, arbitrary)
    """
    session, db = utils.create_transaction_session()

    # handle kwargs
    group_id = ObjectId(kwargs["group_id"])
    document_id = kwargs["document_id"]

    group = db.groups.find_one({'_id': group_id})
    if not group:
        logging.info(f"Warning: group with id {group_id} not found.")
        raise Exception(f"group with id {group_id} not found")

    history_item = group["history"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()
    history_item["included_documents"].remove(document_id)
    history_item["action"] = "Remove document from group"

    with session.start_transaction():
        db.groups.update_one({'_id': group_id}, {
            "$push":
                {
                    "history": {
                        "$each": [history_item],
                        "$position": 0
                    }
                }
            }, session=session)
        utils.commit_with_retry(session)
        

@app.task
def update_group_label(*args, **kwargs):
    """
    Update the label of the specified group_id.

    kwargs:
        group_id: (int, represents ObjectId for a group)
        label: (string, arbitrary)
    """    
    session, db = utils.create_transaction_session()
    
    # handle kwargs
    group_id = ObjectId(kwargs["group_id"])
    group = db.groups.find_one({'_id': group_id})
    if not group:
        logging.info(f"Warning: group with id {group_id} not found.")
        raise Exception(f"group with id {group_id} not found")
    

    history_item = group["history_item"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()
    history_item["action"] = "Update group label"

    with session.start_transaction():
        db.groups.update_one({'_id': group_id}, {
                "$push":
                    {
                        "history": {
                            "$each": [history_item],
                            "$position": 0
                        }
                    }
                }, session = session)
        utils.commit_with_retry(session)


@app.task
def add_note(*args, **kwargs):
    """
    Adds a note to the notes collection.

    kwargs:
        id: document_id (string) 
    """    
    # Try finding document
    session, db = utils.create_transaction_session()
    document_id = kwargs["document_id"]

    if not db.documents.find_one({'id': document_id}):
        logging.info(f"Warning: document with id {document_id} not found.")
        raise Exception(f"document with id {document_id} not found")

    obj = {
        "document_id": document_id,
        "creation_time": datetime.datetime.utcnow(),
        "history": [{
            "content": {},
            "timestamp": datetime.datetime.utcnow()
        }]
    }
    with session.start_transaction():
        res = db.notes.insert_one(obj, session=session)
        logging.info(f"Added note for document {document_id} with result {res}.")
        utils.commit_with_retry(session)


@app.task
def update_note(*args, **kwargs):
    """
    Updates a note.

    kwargs:
        document_id: string
        content: string
    """
    session, db = utils.commit_with_retry()
    document_id = kwargs["document_id"]
    content = kwargs["content"]

    if not db.notes.find_one({'document_id': document_id}):
        logging.info(f"Warning: note with id {document_id} not found.")
        raise Exception(f"note with id {document_id} not found")

    with session.start_transaction():
        res = db.notes.update_one({"document_id": document_id}, {"$push":
                {
                    "history": {
                        "$each": [{
                        "content": content,
                        "timestamp": datetime.datetime.utcnow()
                        }],
                        "$position": 0
                    }
                }
            }, session=session)
        utils.commit_with_retry(session)
        logging.info(f"Updated note for document {document_id} with result {res}.")


@app.task
def cluster_by_groups(*args, **kwargs):
    """
    Cluster documents using user-provided group ids.

    kwargs:

        teleoscope_oid: GridFS OID address for ranked documents. 
        Note this assumes that a teleoscope has already been created for this group.

        group_id_strings: list(string) where the strings are MongoDB ObjectID format

        session_oid: string OID for session to add clusters to
    """
    import clustering
    logging.info(f'Starting clustering for groups {kwargs["group_id_strings"]} in session {kwargs["session_oid"]}.')
    clustering.cluster_by_groups(kwargs["group_id_strings"], kwargs["session_oid"])


@app.task
def register_account(*arg, **kwargs):
    """
    Adds a newly registered user to users collection
    kwargs:
        firstName: (string)
        lastName: (string)
        password: (hash)
        username: (email)
    """

    transaction_session, db = utils.create_transaction_session()

    #handle kwargs
    first_name = kwargs["firstName"]
    last_name = kwargs["lastName"]
    password = kwargs["password"]
    username = kwargs["username"]

    #creating document to be inserted into mongoDB
    obj = {
        "creation_time": datetime.datetime.utcnow(),
        "firstName": first_name,
        "lastName": last_name,
        "password": password,
        "username": username,
        "sessions":[],
        "action": "initialize a user"
    }

    collection = db.users
    with transaction_session.start_transaction():
        users_res = collection.insert_one(obj, session=transaction_session)
        logging.info(f"Added user {username} with result {users_res}.")
        utils.commit_with_retry(transaction_session)


class reorient(Task):
    """
    Class-based task which allows us to maintain the model state.
    """

    def __init__(self):
        self.documentsCached = False
        self.allDocumentIDs = None
        self.allDocumentVectors = None
        self.db = None
        self.model = None

    def cacheDocumentsData(self, path='~/embeddings/'):
        # cache embeddings
        from pathlib import Path
        dir = Path(path).expanduser()
        dir.mkdir(parents=True, exist_ok=True)
        npzpath = Path(path + 'embeddings.npz').expanduser()
        pklpath = Path(path + 'ids.pkl').expanduser()
        
        if npzpath.exists() and pklpath.exists():
            logging.info("Documents have been cached, retrieving now.")
            loadDocuments = np.load(npzpath.as_posix(), allow_pickle=False)
            with open(pklpath.as_posix(), 'rb') as handle:
                self.allDocumentIDs = pickle.load(handle)
            self.allDocumentVectors = loadDocuments['documents']
            self.documentsCached = True
        else:
            logging.info("Documents are not cached, building cache now.")
            db = utils.connect()
            allDocuments = utils.getAllDocuments(db, projection={'id':1, 'textVector':1, '_id':0}, batching=True, batchSize=10000)
            ids = [x['id'] for x in allDocuments]
            logging.info(f'There are {len(ids)} ids in documents.')
            vecs = np.array([x['textVector'] for x in allDocuments])

            np.savez(npzpath.as_posix(), documents=vecs)
            with open(pklpath.as_posix(), 'wb') as handle:
                pickle.dump(ids, handle, protocol=pickle.HIGHEST_PROTOCOL)
            self.allDocumentIDs = ids
            self.allDocumentVectors = vecs
            self.documentsCached = True
        return


    def computeResultantVector(self, positive_docs, negative_docs):
        """
        Computes the resultant vector for positive and negative docs.
        Resultant vector is the final vector that the stateVector of
        the teleoscope should move towards/away from.

        Args:
            positive_docs: docs to move towards
            negative_docs: docs to move away from

        Returns:
            resultantVec: new Teleoscope vector (np.array[512])
            direction: direction to move (int: 1, -1)
        """        
        # get vectors for positive and negative doc ids
        # using utils.getDocumentVector function
        # TODO: OPTIMIZE

        posVecs = []  # vectors we want to move towards
        for pos_id in positive_docs:
            v = utils.getDocumentVector(self.db, pos_id)
            posVecs.append(v)

        negVecs = []  # vectors we want to move away from
        for neg_id in negative_docs:
            v = utils.getDocumentVector(self.db, neg_id)
            negVecs.append(v)

        avgPosVec = None  # avg positive vector
        avgNegVec = None  # avg negative vector
        direction = 1  # direction of movement

        # handle different cases of number of docs in each list
        if len(posVecs) >= 1:
            avgPosVec = np.array(posVecs).mean(axis=0)
        if len(negVecs) >= 1:
            avgNegVec = np.array(negVecs).mean(axis=0)

        # if both lists are not empty
        if avgPosVec is not None and avgNegVec is not None:
            resultantVec = avgPosVec - avgNegVec
        # if only negative list has entries
        elif avgPosVec is None and avgNegVec is not None:
            resultantVec = avgNegVec
            # change direction of movement since we want to move away in this case
            direction = -1
        # if only positive list has entries
        elif avgPosVec is not None and avgNegVec is None:
            resultantVec = avgPosVec
        
        resultantVec /= np.linalg.norm(resultantVec)
        return resultantVec, direction

    def run(self, teleoscope_id: str, positive_docs: list, negative_docs: list, magnitude=0.5):
        logging.info(f'Received reorient for teleoscope id {teleoscope_id}, positive docs {positive_docs}, negative docs {negative_docs}, and magnitude {magnitude}.')
        # either positive or negative docs should have at least one entry
        if len(positive_docs) == 0 and len(negative_docs) == 0:
            # if both are empty, then cache stuff if not cached alreadt
            # Check if document ids and vectors are cached
            if self.documentsCached == False:
                self.cacheDocumentsData()

            # Check if db connection is cached
            if self.db is None:
                self.db = utils.connect()

            # do nothing since no feedback given on docs
            logging.info(f'No positive or negative docs specified for teleoscope {teleoscope_id}.')
            return 200 # trival pass

        # Check if document ids and vectors are cached
        if self.documentsCached == False:
            self.cacheDocumentsData()

        # Check if db connection is cached
        if self.db is None:
            self.db = utils.connect()

        # get query document from teleoscopes collection
        _id = ObjectId(teleoscope_id)
        teleoscope = self.db.teleoscopes.find_one({"_id": _id})

        if teleoscope is None:
            logging.info(f'Teleoscope with id {_id} does not exist!')
            return 400  # fail

        # check if stateVector exists
        stateVector = []
        if len(teleoscope['history'][0]['stateVector']) > 0:
            stateVector = np.array(teleoscope['history'][0]['stateVector'])
        else:
            docs = positive_docs + negative_docs
            first_doc = self.db.documents.find_one({"id": docs[0]})
            logging.info(f'Results of finding first_doc: {first_doc["_id"]}.')
            stateVector = first_doc['textVector']  # grab textVector

        resultantVec, direction = self.computeResultantVector(positive_docs, negative_docs)
        # move qvector towards/away from feedbackVector
        qprime = utils.moveVector(
            sourceVector=stateVector,
            destinationVector=resultantVec,
            direction=direction,
            magnitude=magnitude
        )
        scores = utils.calculateSimilarity(self.allDocumentVectors, qprime)
        newRanks = utils.rankDocumentsBySimilarity(self.allDocumentIDs, scores)
        gridfs_id = utils.gridfsUpload(self.db, "teleoscopes", newRanks)

        rank_slice = newRanks[0:100]
        logging.info(f'new rank slice has length {len(rank_slice)}.')

        history_obj = {
            '_id': teleoscope_id,
            'history_item': {
                'label': teleoscope['history'][0]['label'],
                'positive_docs': positive_docs,
                'negative_docs': negative_docs,
                'stateVector': qprime.tolist(),
                'ranked_document_ids': ObjectId(str(gridfs_id)),
                'rank_slice': rank_slice
            }
        }

        return history_obj
robj = app.register_task(reorient())

#################################################################
# Document importing tasks
#################################################################

@app.task
def read_document(path_to_document):
    '''
    read_document

    input: String (Path to json file)
    output: Dict
    purpose: This function is used to read a single document from a json file to a database
    '''
    try:
        with open(path_to_document, 'r') as f:
            document = json.load(f)
    except Exception as e:
        return {'error': str(e)}

    return document


@app.task
def validate_document(data):
    '''
    validate_document

    input: Dict (document)
    output: Dict
    purpose: This function is used to validate a single document.
            If the file is missing required fields, a dictionary with an error key is returned
    '''
    if data.get('text', "") == "" or data.get('title', "") == "" or data['text'] == '[deleted]' or data['text'] == '[removed]':
        logging.info(f"Document {data['id']} is missing required fields. Document not imported.")
        return {'error': 'Document is missing required fields.'}

    document = {
            'id': data['id'],
            'title': data['title'],
            'text': data['text']}

    return document


@app.task
def read_and_validate_document(path_to_document):
    '''
    read_and_validate_document

    input: String (Path to json file)
    output: Dict
    purpose: This function is used to read and validate a single document from a json file to a database
            If the file is missing required fields, a dictionary with an error key is returned
    '''
    with open(path_to_document) as f:
            data = json.load(f)
    if data['text'] == "" or data['title'] == "" or data['text'] == '[deleted]' or data['text'] == '[removed]':
        logging.info(f"Document {data['id']} is missing required fields. Document not imported.")
        return {'error': 'Document is missing required fields.'}

    document = {
            'id': data['id'],
            'title': data['title'],
            'text': data['text']
    }

    return document

# Write a new function - vectorize_text -> to check that it's actually working
@app.task
def vectorize_document(document): #(text) -> Vector
    '''
    vectorize_document

    input: Dict
    output: Dict
    purpose: This function is used to update the dictionary with a vectorized version of the title and text
            (Ignores dictionaries containing error keys)
    '''
    ## Call vectorize_text in this function - based on the text that you're getting from the document - second step after vectorize_text works
    import tensorflow_hub as hub
    if 'error' not in document:
        # embed = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")
        document['vector'] = vectorize_text([document['title']])
        document['textVector'] = vectorize_text([document['text']])
        # document['vector'] = embed([document['title']]).numpy()[0].tolist() 
        # document['textVector'] = embed([document['text']]).numpy()[0].tolist() 
        return document
    else:
        return document

@app.task
def vectorize_text(text): #(text) -> Vector
    '''
    vectorize_text

    input: string
    output: numpy
    purpose: This function is used to return a vectorized version of the text
            (Assumes the text is error free)
    '''
    import tensorflow_hub as hub
    # if 'error' not in text: 
    embed = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")
    # document['vector'] = embed([document['title']]).numpy()[0].tolist() 
    vector = embed(text).numpy()[0].tolist() # This is required -> don't need document['text'] -> make it text 
    return vector
    
@app.task
def add_single_document_to_database(document):
    '''
    add_single_document_to_database

    input: Dict
    output: void
    purpose: This function adds a single document to the database
            (Ignores dictionaries containing error keys)
    '''
    if 'error' not in document:
         # Create session
        session, db = utils.create_transaction_session()
        target = db.documents 
        with session.start_transaction():
            # Insert document into database
            target.insert_one(document, session=session)
            # Commit the session with retry
            utils.commit_with_retry(session)


@app.task
def add_multiple_documents_to_database(documents):
    '''
    add_single_document_to_database

    input: List[Dict]
    output: void
    purpose: This function adds multiple documents to the database
            (Ignores dictionaries containing error keys)
    '''
    documents = (list (filter (lambda x: 'error' not in x, documents)))
    # Create session
    session, db = utils.create_transaction_session()
    if len(documents) > 0:
        target = db.documents
        with session.start_transaction():
            # Insert documents into database
            target.insert_many(documents, session=session)
            # Commit the session with retry
            utils.commit_with_retry(session)
