import logging, pickle, utils, json, auth, numpy as np
from scipy.sparse import csc_matrix
import clustering
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
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
        
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

    obj = schemas.create_session_object(
        ObjectId(str(userid)),
        label,
        color
    )

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
def snippet(*args, **kwargs):
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)

    session_id = ObjectId(str(kwargs["session_id"]))
    userid = ObjectId(str(kwargs["userid"]))
    document_id =  ObjectId(str(kwargs["document_id"]))
    text = kwargs["text"]
    
    snip = {
        "document_id": document_id,
        "userid": userid,
        "text": text,
        "vector": vectorize_text([text])
    }
    session = db.sessions.find_one({"_id": session_id})
    history_item = session["history"][0]
    history_item["user"] = userid
    history_item["action"] = f"Add snippet for session {session_id} and document {document_id}."

    with transaction_session.start_transaction():
        utils.push_history(db, "sessions", session_id, history_item, transaction_session)
        db.snippets.insert_one(snip, session=transaction_session)
        utils.commit_with_retry(transaction_session)


@app.task
def recolor_session(*args, **kwargs):
    """
    Recolors a session.
    """
    session_id = ObjectId(str(kwargs["session_id"]))
    userid = ObjectId(str(kwargs["userid"]))
    
    color = kwargs["color"]

    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)

    session = db.sessions.find_one({"_id": session_id})

    history_item = session["history"][0]
    history_item["color"] = color
    history_item["user"] = userid    
    history_item["action"] = "Recolor session."

    with transaction_session.start_transaction():
        utils.push_history(db, "sessions", session_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)
    return 200

@app.task
def save_UI_state(*args, **kwargs):
    """
    Updates a session document in the sessions collection.
    kwargs: 
        session_id: (int, represents ObjectId in int)
        history_item: (Dict)
    """
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    session_id = ObjectId(str(kwargs["session_id"]))

    logging.info(f'Saving state for {session_id}.')

    # check if session id is valid, if not, raise exception
    session = db.sessions.find_one({"_id": session_id})
    if not session:
        logging.info(f"Session {session_id} not found.")
        raise Exception("Session not found")

    userid = ObjectId(str(kwargs["userid"]))

    history_item = session["history"][0]
    history_item["bookmarks"] = kwargs["bookmarks"]
    history_item["windows"] =  kwargs["windows"]
    history_item["edges"] =  kwargs["edges"]
    history_item["timestamp"] = datetime.datetime.utcnow()
    history_item["action"] = "Save UI state"
    history_item["user"] = userid

    utils.push_history(db, "sessions", session_id, history_item)

    return 200 # success

@app.task
def relabel_session(*args, **kwargs):
    """
    Relabels a session.
    """
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)

    relabeled_session_id = ObjectId(str(kwargs["relabeled_session_id"]))
    userid = ObjectId(str(kwargs["userid"]))
    label = kwargs["label"]

    session = db.sessions.find_one({"_id": relabeled_session_id}, session=transaction_session)
    history_item = session["history"][0]
    history_item["label"] = label
    history_item["user"] = userid
    history_item["action"] = "Relabeled session"

    with transaction_session.start_transaction():
        utils.push_history(db, "sessions", relabeled_session_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)
    return 200


@app.task
def relabel_group(*args, **kwargs):
    """
    Relabels a group.
    """
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)

    group_id = ObjectId(str(kwargs["group_id"]))
    userid = ObjectId(str(kwargs["userid"]))
    label = kwargs["label"]

    group = db.groups.find_one({"_id": group_id}, session=transaction_session)
    history_item = group["history"][0]
    history_item["label"] = label
    history_item["user"] = userid
    history_item["action"] = "Relabeled group"

    with transaction_session.start_transaction():
        utils.push_history(db, "groups", group_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)
    return 200

@app.task
def relabel_teleoscope(*args, **kwargs):
    """
    Relabels a teleoscope.
    """
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)

    teleoscope_id = ObjectId(str(kwargs["teleoscope_id"]))
    userid = ObjectId(str(kwargs["userid"]))
    label = kwargs["label"]

    session = db.teleoscopes.find_one({"_id": teleoscope_id}, session=transaction_session)
    history_item = session["history"][0]
    history_item["label"] = label
    history_item["user"] = userid

    with transaction_session.start_transaction():
        utils.push_history(db, "teleoscopes", teleoscope_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)
    return 200


@app.task
def save_teleoscope_state(*args, **kwargs):
    """
    Save the current state of a teleoscope.
    
    input:
        _id (int, represents ObjectId for a teleoscope)
        history_item (Dict)
    """
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
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

    with transaction_session.start_transaction():
        utils.push_history(db, "teleoscopes", obj_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)

    
@app.task
def recolor_group(*args, **kwargs):
    """
    Recolors a group.
    """
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    group_id = ObjectId(str(kwargs["group_id"]))
    userid = ObjectId(str(kwargs["userid"]))
    color = kwargs["color"]

    session = db.groups.find_one({"_id": group_id}, session=transaction_session)
    history_item = session["history"][0]
    history_item["color"] = color
    history_item["user"] = userid

    with transaction_session.start_transaction():
        utils.push_history(db, "groups", group_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)
    return 200


@app.task
def create_child(*args, **kwargs):
    """
    Add new child document to session.
    kwargs:
        start_index: (int, represents index from which you start slicing the parent document)
        end_index: (int, represents index from which you end slicing of the parent document)
        document_id: (int, represents ObjectId in int)
    """
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
        # When you do transaction, you want to do it inside this transaction session
    with transaction_session.start_transaction(): 
        document_id = ObjectId(str(kwargs["document_id"]))
        start_index = kwargs['start_index']
        
        end_index = kwargs['end_index']
        document = db.documents.find_one({"_id": document_id})
        #check to see if the end_index is lesser than the document's last index
        length_document = len(document["text"])
        if end_index >= length_document:
            raise Exception(f'End_index {end_index} is outside bounds of document')
        child_text = document["text"][start_index:end_index] 
        child_title = document["title"] + " child"
        child_id = f"{str(document_id)}#{str(start_index)}#{str(end_index)}"
        child_vector = vectorize_text([child_text])
        child_document = schemas.create_document_object(child_title, child_id, child_vector, child_text, document)
        inserted_document = db.documents.insert_one(child_document, session=transaction_session)
        new_id = inserted_document.inserted_id
        print(child_id)
        utils.commit_with_retry(transaction_session)
    return {child_id, new_id}

@app.task
def add_user_to_session(*args, **kwargs):
    """
    Add new user to session's userlist. Provide read/write access.
    kwargs:
        userid: (string, BSON ObjectId format)
        contributor: (string, represent username of contributor to be added)
        session_id: (int, represents ObjectId in int)
    """
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
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

    if "logical_clock" in history_item:
        history_item["logical_clock"] = history_item["logical_clock"] + 1
    else:
        history_item["logical_clock"] = 1

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
    Performs a text query on db.documents text index.
    If the query string already exists in the teleoscopes collection, returns existing reddit_ids.
    Otherwise, adds the query to the teleoscopes collection and performs a text query the results of which are added to the
    teleoscopes collection and returned.
    
    kwargs:
        session_id: string
        label: string (optional)
    """
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
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
  
        ui_session = db.sessions.find_one({'_id': ObjectId(str(session_id))}, session=transaction_session)
        history_item = ui_session["history"][0]
        history_item["timestamp"] = datetime.datetime.utcnow()
        history_item["teleoscopes"].append(ObjectId(teleoscope_result.inserted_id))
        history_item["action"] = "Initialize Teleoscope"
        history_item["user"] = user_id

        # associate the newly created teleoscope with correct session
        utils.push_history(db, "sessions", ObjectId(str(session_id)), history_item, transaction_session)
        utils.commit_with_retry(transaction_session)
    return teleoscope_result


@app.task 
def add_group(*args, description="A group", documents=[], **kwargs):
    """
    Adds a group to the group collection and links newly created group to corresponding session.
    
    args: 
        description: topic label for cluster
        included documents: documents included in group

    kwargs: 
        label: (string, arbitrary)
        color: (string, hex color)
        session_id: (string, represents ObjectId)
    """
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle kwargs
    color = kwargs["color"]
    label = kwargs["label"]
    _id = ObjectId(str(kwargs["session_id"]))
    userid = kwargs["userid"]
    
    user = db.users.find_one({"_id": ObjectId(str(userid))})
    user_id = "1"
    if user != None:
        user_id = user['_id']

    # teleoscope_result = initialize_teleoscope(userid=userid, session_id=_id, label=label)

    # Creating document to be inserted into mongoDB

    obj = schemas.create_group_object(color, documents, label, "Initialize group", user_id, description)
    
    # call needs to be transactional due to groups & sessions collections being updated


    groups_res = db.groups.insert_one(obj)
    logging.info(f"Added group {obj['history'][0]['label']} with result {groups_res}.")
    # add created groups document to the correct session
    session = db.sessions.find_one({'_id': _id})
    if not session:
        logging.info(f"Warning: session with id {_id} not found.")
        raise Exception(f"session with id {_id} not found")

    groups = session["history"][0]["groups"]
    groups.append(groups_res.inserted_id)

    history_item = session["history"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()
    history_item["groups"] = groups
    history_item["action"] = f"Initialize new group: {label}"
    history_item["user"] = user_id

    sessions_res = utils.push_history(db, "sessions", _id, history_item)    
    logging.info(f"Associated group {obj['history'][0]['label']} with session {_id} and result {sessions_res}.")
    return groups_res.inserted_id
    
@app.task
def copy_cluster(*args, **kwargs):
    """
    copies a cluster to a group
    
    kwargs:
        cluster_id: (str) the cluster to copy
        session_id: (str) the session to copy to
        user_id: (str) the user commiting the action
        
    """

    cluster_id = ObjectId(str(kwargs["cluster_id"]))
    session_id = ObjectId(str(kwargs["session_id"]))
    user_id = ObjectId(str(kwargs["userid"]))
    
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    cluster = db.clusters.find_one({"_id": cluster_id })
    session = db.sessions.find_one({"_id": session_id })

    obj = schemas.create_group_object(
        cluster["history"][0]["color"], 
        cluster["history"][0]["included_documents"], 
        cluster["history"][0]["label"], 
        "Copy cluster", 
        user_id, 
        cluster["history"][0]["description"])

    with transaction_session.start_transaction():
        group_res = db.groups.insert_one(obj, session=transaction_session)
        history_item = session["history"][0]
        history_item["groups"] = [*history_item["groups"], group_res.inserted_id]
        utils.push_history(db, "sessions", session_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)


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
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
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
    history_item = group_new["history"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()
    history_item["included_documents"] = included_documents
    history_item["action"] = f"Copying group ({group_id}) data"
    history_item["user"] = user_id

    with transaction_session.start_transaction():
        utils.push_history(db, "groups", group_new_id, history_item, transaction_session)
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
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
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

    with transaction_session.start_transaction():
        utils.push_history(db, "groups", group_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)
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
def remove_teleoscope(*args, **kwargs):
    """
    Delete a teleoscope (not the documents within) from the session. Teleoscope is not deleted from the whole system, just the session.
    kwargs:
        teleoscope_id: ObjectId
        session_id: ObjectId
        user_id: ObjectId
    """
    teleoscope_id = ObjectId(str(kwargs["teleoscope_id"]))
    session_id = ObjectId(str(kwargs["session_id"]))
    user_id = ObjectId(str(kwargs["userid"]))

    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    session = db.sessions.find_one({'_id': session_id}, session=transaction_session)        
    history_item = session["history"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()        
    history_item["teleoscopes"].remove(teleoscope_id)
    history_item["action"] = f"Remove teleoscope from session"
    history_item["user"] = user_id

    with transaction_session.start_transaction():
        utils.push_history(db, "sessions", session_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)


@app.task
def remove_group(*args, **kwargs):
    """
    Delete a group (not the documents within) from the session. Group is not deleted from the whole system, just the session.
    kwargs:
        group_id: ObjectId
        session_id: ObjectId
        user_id: ObjectId
    """
    group_id = ObjectId(str(kwargs["group_id"]))
    session_id = ObjectId(str(kwargs["session_id"]))
    user_id = ObjectId(str(kwargs["userid"]))

    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    session = db.sessions.find_one({'_id': session_id}, session=transaction_session)        
    history_item = session["history"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()        
    history_item["groups"].remove(group_id)
    history_item["action"] = f"Remove group from session"
    history_item["user"] = user_id

    with transaction_session.start_transaction():
        utils.push_history(db, "sessions", session_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)
        logging.info(f"Removed group {group_id} from session {session_id}.")

    return session_id


@app.task
def remove_document_from_group(*args, **kwargs):
    """
    Remove the document_id from the included_documents of the specified group_id.

    kwargs:
        group_id (int, represents ObjectId for a group)
        document_id (string, arbitrary)
    """
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
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

    with transaction_session.start_transaction():
        utils.push_history(db, "groups", group_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)


@app.task
def update_note(*args, **kwargs):
    """
    Updates a note.

    kwargs:
        note_id: string
        userid: string
        db: string

        content: string 
    """
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    userid = ObjectId(str(kwargs["userid"]))
    note_id = ObjectId(str(kwargs["note_id"]))
    content = kwargs["content"]

    text = " ".join([block["text"] for block in content["blocks"]])
    vector = vectorize_text(text)
    logging.info(f"Vectorized note with {text}.")

    note = db.notes.find_one({"_id": note_id})
    history_item = note["history"][0]
    history_item["content"] = content
    history_item["action"] = "Update note content."
    history_item["userid"] = userid

    with transaction_session.start_transaction():
        res = utils.push_history(db, "notes", note_id, history_item, transaction_session)
        db.notes.update_one({"_id": note_id}, {"$set": {"textVector": vector}}, session=transaction_session)
        utils.commit_with_retry(transaction_session)
        logging.info(f"Updated note {note_id} with {res}.")

@app.task
def relabel_note(*args, **kwargs):
    """
    Relabels a note.

    kwargs:
        note_id: string
        userid: string
        db: string

        label: string 
    """
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    userid = ObjectId(str(kwargs["userid"]))
    note_id = ObjectId(str(kwargs["note_id"]))
    label = kwargs["label"]
    note = db.notes.find_one({"_id": note_id})
    history_item = note["history"][0]
    history_item["label"] = label
    history_item["action"] = "Update note label."
    history_item["userid"] = userid

    with transaction_session.start_transaction():
        res = utils.push_history(db, "notes", note_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)
        logging.info(f"Updated note {note_id} with {res} and label {label}.")

@app.task
def update_group_label(*args, **kwargs):
    """
    Update the label of the specified group_id.

    kwargs:
        group_id: (int, represents ObjectId for a group)
        label: (string, arbitrary)
    """    
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle kwargs
    group_id = ObjectId(kwargs["group_id"])
    group = db.groups.find_one({'_id': group_id})
    if not group:
        logging.info(f"Warning: group with id {group_id} not found.")
        raise Exception(f"group with id {group_id} not found")
    

    history_item = group["history_item"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()
    history_item["action"] = "Update group label"

    with transaction_session.start_transaction():
        utils.push_history(db, "groups", group_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)


@app.task
def add_note(*args, **kwargs):
    """
    Adds a note to the notes collection.

    kwargs:
        id: document_id (string) 
    """    
    # Try finding document
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    label = kwargs["label"]
    content = kwargs["content"]
    session_id = ObjectId(str(kwargs["session_id"]))
    userid = ObjectId(str(kwargs["userid"]))

    text = " ".join([block["text"] for block in content["blocks"]])
    vector = vectorize_text(text)

    note = schemas.create_note_object(userid, label, content, vector)
    with transaction_session.start_transaction():
        res = db.notes.insert_one(note, session=transaction_session)
        session = db.sessions.find_one({"_id": session_id}, session=transaction_session)
        history_item = session["history"][0]
        history_item["user"] = userid,
        history_item["action"] = "Add note"
        history_item["notes"].append(res.inserted_id) 
        utils.push_history(db, "sessions", session_id, history_item, transaction_session)
        logging.info(f"Added note with result {res}.")
        utils.commit_with_retry(transaction_session)

@app.task
def remove_note(*args, **kwargs):
    """
    Removes a note from the session but NOT from the notes collection.

    kwargs:
        id: document_id (string) 
    """    
    # Try finding document
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    userid = ObjectId(str(kwargs["userid"]))

    note_id = ObjectId(str(kwargs["note_id"]))
    session_id = ObjectId(str(kwargs["session_id"]))

    session = db.sessions.find_one({"_id": session_id}, session=transaction_session)
    history_item = session["history"][0]
    history_item["user"] = userid,
    history_item["action"] = "Remove note"
    history_item["notes"].remove(note_id) 

    with transaction_session.start_transaction():
        utils.push_history(db, "sessions", session_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)
        logging.info(f"Removed note {note_id} from session {session_id}.")


@app.task
def cluster_by_groups(*args, **kwargs):
    """
    Cluster documents using user-provided group ids.

    kwargs:
        user_id: ObjectId
        group_id_strings: list(string) where the strings are MongoDB ObjectID format
        session_oid: string OID for session to add clusters to
    """
    logging.info(f'Starting clustering for groups {kwargs["group_id_strings"]} in session {kwargs["session_oid"]}.')
    cluster = clustering.Clustering(kwargs["userid"], kwargs["group_id_strings"], kwargs["projection_id"], kwargs["session_oid"], kwargs["db"])
    cluster.clustering_task()

@app.task
def update_edges(*arg, **kwargs):
    """
    Updates the graph according to updated edges.
    
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    edges = kwargs["edges"]
    source_node = kwargs["source_node"]
    target_node = kwargs["target_node"]

    
    docid_pipeline = [
        { '$project': { '_id': 1 } },  # Include only the _id field
        { '$sort': { '_id': 1 } }  # Sort by _id field in ascending order
    ]

    result = db.documents.aggregate(docid_pipeline)
    document_ids = [doc['_id'] for doc in result]

    pipeline = [
        {
            '$graphLookup': {
                'from': 'your_collection_name',  # Replace with the same collection name
                'startWith': target_docset_oid,
                'connectFromField': 'edges.source',  # Replace with the field representing the parent relationship
                'connectToField': '_id',
                'as': 'connected_elements',
                'maxDepth': 10  # Specify the maximum depth of the recursive search
            }
        },
        {
            '$project': {
                '_id': 1,
                'connected_elements': 1
            }
        }
    ]
    """
    pass
    
    
    
    

@app.task
def register_account(*arg, **kwargs):
    """
    Adds a newly registered user to users collection
    kwargs:
        password: (hash)
        username: (email)
    """

    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    #handle kwargs
    password = kwargs["password"]
    username = kwargs["username"]

    #creating document to be inserted into mongoDB
    obj = {
        "creation_time": datetime.datetime.utcnow(),
        "password": password,
        "username": username,
        "sessions":[],
        "action": "initialize a user"
    }

    with transaction_session.start_transaction():
        users_res = db.users.insert_one(obj, session=transaction_session)
        logging.info(f"Added user {username} with result {users_res}.")
        utils.commit_with_retry(transaction_session)

    user = db.users.find_one({"username":username})

    initialize_session(userid=user["_id"], label="default", color="#e76029", db=database)

class reorient(Task):
    """
    Class-based task which allows us to maintain the model state.
    """

    def __init__(self):
        self.documentsCached = False
        self.allDocumentIDs = None
        self.allDocumentVectors = None
        self.db = None
        self.client = None
        self.model = None
        self.dbstring = None

    def cacheDocumentsData(self):
        # cache embeddings
        from pathlib import Path
        dir = Path(f'~/embeddings/{self.dbstring}/').expanduser()
        dir.mkdir(parents=True, exist_ok=True)
        npzpath = Path(f'~/embeddings/{self.dbstring}/embeddings.npz').expanduser()
        pklpath = Path(f'~/embeddings/{self.dbstring}/ids.pkl').expanduser()
        
        if npzpath.exists() and pklpath.exists():
            logging.info("Documents have been cached, retrieving now.")
            loadDocuments = np.load(npzpath.as_posix(), allow_pickle=False)
            with open(pklpath.as_posix(), 'rb') as handle:
                self.allDocumentIDs = pickle.load(handle)
            self.allDocumentVectors = loadDocuments['documents']
            self.documentsCached = True
        else:
            logging.info("Documents are not cached, building cache now.")
            self.connect()
            allDocuments = utils.getAllDocuments(self.db, projection={'textVector':1, '_id':1}, batching=True, batchSize=10000)
            ids = [str(x['_id']) for x in allDocuments]
            logging.info(f'There are {len(ids)} ids in documents.')
            vecs = np.array([x['textVector'] for x in allDocuments])

            np.savez(npzpath.as_posix(), documents=vecs)
            with open(pklpath.as_posix(), 'wb') as handle:
                pickle.dump(ids, handle, protocol=pickle.HIGHEST_PROTOCOL)
            self.allDocumentIDs = ids
            self.allDocumentVectors = vecs
            self.documentsCached = True
        
        return self.allDocumentIDs, self.allDocumentVectors


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

    def average(self, documents: list):
        self.connect()
        document_vectors = []
        for doc_id in documents:
            print(f'Finding doc {doc_id}')
            # Define the aggregation pipeline
            pipeline = [
                { '$match': { "_id" : ObjectId(str(doc_id)) } },
                {
                    '$unionWith': {
                        'coll': 'notes',
                        'pipeline': [
                            { '$match': { "_id" : ObjectId(str(doc_id)) } }
                        ]
                    }
                }
            ]

            # Execute the aggregation query
            result = list(self.db.documents.aggregate(pipeline))
            print("result", result)

            # # Process the result
            # for document in result:
            #     # Process each document
            #     print(document)

            # doc = self.db.documents.find_one({"_id": ObjectId(str(doc_id))})
            document_vectors.append(result[0]["textVector"])
        vec = np.average(document_vectors, axis=0)
        return vec
    
    def connect(self):
        if self.db is None:
            self.db = utils.connect(db=self.dbstring)

    def run(self, edges: list, userid: str, db: str, **kwargs):
         # Check if document ids and vectors are cached
         
        if self.dbstring is None:
            self.dbstring = db

        if self.documentsCached == False:
            _, _ = self.cacheDocumentsData()

        self.connect()

        teleoscopes = {}
        for edge in edges:
            source = edge["source"].split("%")[0]
            target = edge["target"].split("%")[0]
            sources = []

            if target not in teleoscopes:
                teleoscopes[target] = []

            if edge["source"].split("%")[-1] == "group":
                res = self.db.groups.find_one({"_id": ObjectId(str(source))})
                sources = [id for id in res["history"][0]["included_documents"]]

            if edge["source"].split("%")[-1] == "document" or edge["source"].split("%")[-1] == "note":
                sources.append(source)

            teleoscopes[target] = [*sources, *teleoscopes[target]]

        print(f'Telescope graph: {teleoscopes}')
        for teleoscope_id, documents in teleoscopes.items():
            vec = self.average(documents)
            teleoscope = self.db.teleoscopes.find_one({"_id": ObjectId(str(teleoscope_id))})
            scores = utils.calculateSimilarity(self.allDocumentVectors, vec)

            newRanks = utils.rankDocumentsBySimilarity(self.allDocumentIDs, scores)
            gridfs_id = utils.gridfsUpload(self.db, "teleoscopes", newRanks)

            rank_slice = newRanks[0:100]
            logging.info(f'new rank slice has length {len(rank_slice)}.')

            history_item = schemas.create_teleoscope_history_item(
                teleoscope['history'][0]['label'],
                teleoscope['history'][0]['reddit_ids'],
                documents,
                [],
                vec.tolist(),
                ObjectId(str(gridfs_id)),
                rank_slice,
                "Reorient teleoscope",
                ObjectId(str(userid))
            )

            # transaction_session, db = utils.create_transaction_session(db=self.dbstring)
            utils.push_history(self.db, None, "teleoscopes", ObjectId(str(teleoscope_id)), history_item)
            # utils.commit_with_retry(transaction_session)
        return {}
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
        document['vector'] = vectorize_text([document['title']])
        document['textVector'] = vectorize_text([document['text']])
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
    embed = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")
    vector = embed([text]).numpy()[0].tolist()
    return vector
    

@app.task
def add_single_document_to_database(document, **kwargs):
    '''
    add_single_document_to_database

    input: Dict
    output: void
    purpose: This function adds a single document to the database
            (Ignores dictionaries containing error keys)
    '''
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    with transaction_session.start_transaction():
        # Insert document into database
        db.documents.insert_one(document, session=transaction_session)
        # Commit the session with retry
        utils.commit_with_retry(transaction_session)

@app.task
def add_multiple_documents_to_database(documents, **kwargs):
    '''
    add_single_document_to_database

    input: List[Dict]
    output: void
    purpose: This function adds multiple documents to the database
            (Ignores dictionaries containing error keys)
    '''
    documents = (list (filter (lambda x: 'error' not in x, documents)))
    # Create session
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    if len(documents) > 0:
        target = db.documents
        with transaction_session.start_transaction():
            # Insert documents into database
            target.insert_many(documents, session=transaction_session)
            # Commit the session with retry
            utils.commit_with_retry(transaction_session)
    
@app.task
def mark(*args, **kwargs):
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    userid      = ObjectId(str(kwargs["userid"]))
    document_id = ObjectId(str(kwargs["document_id"]))
    session_id  = ObjectId(str(kwargs["session_id"]))
    read        = kwargs["read"]
    session     = db.sessions.find_one({"_id": session_id})
    history_item = session["history"][0]
    history_item["userid"] = userid
    history_item["action"] = f"Mark document read set to {read}."

    with transaction_session.start_transaction():
        db.documents.update_one({"_id": document_id}, {"$set": {"state.read": read}})        
        utils.push_history(db, "teleoscopes", session_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)

@app.task 
def initialize_projection(*args, **kwargs):
    """
    initialize a projection object
    """
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle kwargs
    label = kwargs["label"]
    session_id = ObjectId(str(kwargs["session_id"]))
    userid = kwargs["userid"]
    
    user = db.users.find_one({"_id": ObjectId(str(userid))})
    user_id = "1"
    if user != None:
        user_id = user['_id']

    obj = schemas.create_projection_object(session_id, label, user_id)

    with transaction_session.start_transaction():

        projection_res = db.projections.insert_one(obj, session=transaction_session)
        logging.info(f"Added projection {obj['history'][0]['label']} with result {projection_res}.")
        
        session = db.sessions.find_one({'_id': session_id}, session=transaction_session)
        if not session:
            logging.info(f"Warning: session with id {session_id} not found.")
            raise Exception(f"session with id {session_id} not found")

        history_item = session["history"][0]
        history_item["timestamp"] = datetime.datetime.utcnow()
        history_item["projections"].append(projection_res.inserted_id)
        history_item["action"] = f"Initialize new projection: {label}"
        history_item["user"] = user_id

        sessions_res = utils.push_history(db, "sessions", session_id, history_item, transaction_session)
        
        logging.info(f"Associated projection {obj['history'][0]['label']} with session {session_id} and result {sessions_res}.")
        utils.commit_with_retry(transaction_session)
        return projection_res.inserted_id
    
@app.task
def remove_projection(*args, **kwargs):
    """
    Delete a projection and associated clusters
    """
    projection_id = ObjectId(str(kwargs["projection_id"]))
    session_id = ObjectId(str(kwargs["session_id"]))
    user_id = ObjectId(str(kwargs["userid"]))

    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    session = db.sessions.find_one({'_id': session_id}, session=transaction_session)        
    history_item = session["history"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()        
    history_item["projections"].remove(projection_id)
    history_item["action"] = f"Remove projection from session"
    history_item["user"] = user_id

    with transaction_session.start_transaction():
        
        cluster = clustering.Clustering(kwargs["userid"], [], kwargs["projection_id"], kwargs["session_id"], kwargs["db"])
        cluster.clean_mongodb() # cleans up clusters associate with projection
        db.projections.delete_one({'_id': projection_id}, session=transaction_session) 

        utils.push_history(db, "sessions", session_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)

@app.task
def relabel_projection(*args, **kwargs):
    """
    Relabels a projection.
    """
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)

    projection_id = ObjectId(str(kwargs["projection_id"]))
    userid = ObjectId(str(kwargs["userid"]))
    label = kwargs["label"]

    projection = db.projections.find_one({"_id": projection_id}, session=transaction_session)
    history_item = projection["history"][0]
    history_item["label"] = label
    history_item["action"] = "update label"
    history_item["user"] = userid

    with transaction_session.start_transaction():
        utils.push_history(db, "projections", projection_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)

    return 200


@app.task
def add_item(*args, **kwargs):
    database = kwargs["db"]
    transaction_session, db = utils.create_transaction_session(db=database)

    userid = ObjectId(str(kwargs["userid"]))
    session_id = ObjectId(str(kwargs["session_id"]))

    uid  = kwargs["uid"]
    type = kwargs["type"]
    oid  = kwargs["oid"]

    # If this already exists in the database, we can skip intitalization
    if ObjectId.is_valid(oid):
        docset = db.graph.find_one({"_id" : oid})
        if docset:
            print(f"{type} with {oid} already in DB.")
            return # perhaps do something else before return like save?
    
    logging.info(f"Received {type} with OID {oid} and UID {uid}.")

    match type:
        case "Group":
            import random
            r = lambda: random.randint(0, 255)
            color = '#{0:02X}{1:02X}{2:02X}'.format(r(), r(), r())
            res = add_group(db=database, color=color, label="new group", userid=userid, session_id=session_id, transaction_session=transaction_session)
            message(userid, {
                "oid": str(res),
                "uid": uid,
                "action": "OID_UID_SYNC",
                "description": "Associate OID with UID."
            })
    
        case "Filter" | "Intersection" | "Exclusion" | "Union":
            with transaction_session.start_transaction():
                obj = schemas.create_node(type)
                count = db.documents.count_documents({})
                csc = csc_matrix((count, 2), dtype=np.float32)
                
                csc_id = utils.cscUpload(db, "graph", csc)

                obj["matrix"] = csc_id
                
                res = db.graph.insert_one(obj, session=transaction_session)

                label = f"{res.inserted_id}%{uid}%{type.lower()}"

                session = db.sessions.find_one({"_id": session_id})
                history_item = session["history"][0]

                for node in history_item["windows"]:
                    if node["data"]["uid"] == uid:
                        node["data"]["i"] = str(res.inserted_id)
                        node["data"]["label"] = label
                        node["id"] = label

                history_item["action"] = f"Create {type} node."
                history_item["timestamp"] = datetime.datetime.utcnow()
                history_item["userid"] = userid
                history_item["logical_clock"] = history_item["logical_clock"] + 1

                utils.push_history(db, "sessions", session_id, history_item, transaction_session)
                utils.commit_with_retry(transaction_session)
    return "Help"



def message(userid: ObjectId, msg):
    import pika
    credentials = pika.PlainCredentials(auth.rabbitmq["username"], auth.rabbitmq["password"])
    parameters = pika.ConnectionParameters(host='localhost', port=5672, virtual_host='teleoscope', credentials=credentials)
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()
    queue_name = str(userid)
    channel.basic_publish(exchange='', routing_key=queue_name, body=json.dumps(msg))
    logging.info(f"Sent to queue for userid {userid} and with message {json.dumps(msg)}.")

@app.task
def ping(*args, **kwargs):
    msg = f"ping {userid}"
    userid = ObjectId(str(kwargs["userid"]))
    message(userid, msg)
    