import logging, pickle, json, numpy as np
from scipy.sparse import csc_matrix
from warnings import simplefilter
from celery import Celery, chain
from bson.objectid import ObjectId
from kombu import Consumer, Exchange, Queue
import datetime
from typing import List
from pymongo import client_session, database
import os

# local imports
from . import utils
from . import auth
from . import schemas


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


################################################################################
# Account tasks
################################################################################

@app.task
def register_account(
    *args, database: str, 
    password: str, username: str, 
    **kwargs) -> ObjectId:
    """
    Adds a newly registered user to users collection
    kwargs:
        password: 
            A hashed password.
        username: 
            The username.
    """
    #---------------------------------------------------------------------------  
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # log action to stdout
    logging.info(f"Adding user {username} to {database}.")
    #---------------------------------------------------------------------------
    
    # creating document to be inserted into mongoDB
    obj = schemas.create_user_object(username=username, password=password)
    users_res = db.users.insert_one(obj)

    initialize_workflow(
        database=database,
        userid=users_res.inserted_id,
        label="default", 
        color="#e76029"
    )
    return users_res.inserted_id


################################################################################
# Workflow tasks
################################################################################

@app.task
def initialize_workflow(
    *args, database: str, userid: str, 
    label: str, color: str, 
    **kwargs) -> ObjectId:
    """Adds a workflow to the sessions collection.
    
    Returns:
        Inserted userid.
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
  
    # handle ObjectID kwargs
    userid = ObjectId(str(userid))
    
    # log action to stdout
    logging.info(f'Initializing sesssion for user {userid}.')
    #---------------------------------------------------------------------------
    
    obj = schemas.create_session_object(
        userid=userid,
        label=label,
        color=color
    )

    with transaction_session.start_transaction():
        result = db.sessions.insert_one(obj, session=transaction_session)
        db.users.update_one(
            {"_id": userid},
            {
                "$push": {
                    "sessions": result.inserted_id
                }
            }, session=transaction_session)
        utils.commit_with_retry(transaction_session)
        return result.inserted_id


@app.task
def remove_workflow(
    *args, database: str, session_id: str, userid: str, 
    **kwargs) -> ObjectId:
    """
    Delete a workflow from the user. Workflow is not deleted from the whole 
    system, just the user.
    
    Returns:
        Removed session_id.
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)

    # handle ObjectID kwargs
    session_id = ObjectId(str(session_id))
    userid = ObjectId(str(userid))

    # log action to stdout
    logging.info(f'Removing workflow {session_id} for {userid}.')
    #---------------------------------------------------------------------------
    
    res = db.users.update_one(
        {"_id": userid}, 
        {
            "$pull": { "sessions": session_id}
        }
    )

    return session_id


@app.task
def recolor_workflow(
    *args, database: str, session_id: str, userid: str, 
    color: str,
    **kwargs) -> ObjectId:
    """
    Recolors a workflow.

    Returns:
        Updated session_id.
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)

    # handle ObjectID kwargs
    session_id = ObjectId(str(session_id))
    userid = ObjectId(str(userid))
    
    # log action to stdout
    logging.info(f'Recoloring workflow to color '
                 f'{color} for {userid} and session {session_id}.')
    #---------------------------------------------------------------------------
    
    session = db.sessions.find_one({"_id": session_id})
    history_item = utils.update_history(
        item=session["history"][0],
        color=color,
        userid=userid,
        action="Recolor session."
    )

    with transaction_session.start_transaction():
        utils.push_history(
            db, "sessions", session_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)
    return session_id


@app.task
def relabel_workflow(
    *args, database: str, session_id: str, userid: str, 
    label: str, relabeled_workflow_id: str, 
    **kwargs) -> ObjectId:
    """
    Relabels a session.
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)

    # handle ObjectID kwargs
    session_id = ObjectId(str(session_id))
    userid = ObjectId(str(userid))
    relabeled_workflow_id = ObjectId(str(relabeled_workflow_id))

    # log action to stdout
    logging.info(f'Relabeling workflow to label {label} '
                 f'for {userid} and session {relabeled_workflow_id}.')
    #---------------------------------------------------------------------------
    
    session = db.sessions.find_one({"_id": relabeled_workflow_id})
    history_item = utils.update_history(
        session["history"][0],
        label=label,
        user=userid,
        action="Relabeled session"
    )
    utils.push_history(db, "sessions", relabeled_workflow_id, history_item)
    return relabeled_workflow_id


@app.task
def save_UI_state(
    *args, database: str, session_id: str, userid: str,
    bookmarks: List, nodes: List, edges: List,
    **kwargs) -> ObjectId:
    """
    Updates a workflow document in the sessions collection.
    
    kwargs:
        bookmarks:
            bookmarked documents
        nodes:
            active workspace nodes
        edges:
            active workspace edges
    
    Returns:
        session_id
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle ObjectID kwargs
    session_id = ObjectId(str(session_id))
    userid = ObjectId(str(userid))

    # log action to stdout
    logging.info(f'Saving state for '
                 f'session {session_id} and user {userid}.')
    #---------------------------------------------------------------------------

    session = db.sessions.find_one({"_id": session_id})
    history_item = utils.update_history(
        item=session["history"][0],
        bookmarks=bookmarks,
        nodes=nodes,
        edges=edges,
        action="Save UI state",
        user=userid
    )
    utils.push_history(db, "sessions", session_id, history_item)

    return session_id


@app.task
def add_user_to_session(
    *args, database: str, session_id: str, userid: str, 
    contributor_id: str,
    **kwargs) -> ObjectId:
    """
    Add new user to session's userlist. Provide read/write access.
    kwargs:
        contributor_id: OID of contributor to be added
    
    Returns:
        contributor_id
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle ObjectID kwargs
    session_id = ObjectId(str(session_id))
    userid = ObjectId(str(userid))
    contributor_id = ObjectId(str(contributor_id))
    
    # log action to stdout
    logging.info(f'Adding contributor {contributor_id} by '
                 f'user {userid} to workflow {session_id}.')
    #---------------------------------------------------------------------------

    session = db.sessions.find_one({"_id": session_id})    
    userlist = session["userlist"]

    # check if user has already been added
    if contributor_id in userlist:
        logging.info(f'User {contributor_id} is already on userlist')
        raise Exception(f'User {contributor_id} is already on userlist')

    # add contributor to session's userlist
    userlist["contributors"].append(contributor_id)

    history_item = utils.update_history(
        item=session["history"][0],
        oid=contributor_id,
        action=f"Add {contributor_id} to userlist",
        user=userid,
    )

    # update session with new userlist that includes contributor
    with transaction_session.start_transaction():
        utils.push_history(
            db, "sessions", session_id, history_item, transaction_session)
        db.sessions.update_one(
            {"_id": session_id},
            {
                '$set': {
                    "userlist": userlist,
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

    return contributor_id


################################################################################
# Group tasks
################################################################################

@app.task 
def add_group(
    *args, database: str, userid: str, session_id: str, color: str, 
    label: str, description="A group", documents=[],
    **kwargs) -> ObjectId:
    """
    Adds a group to the group collection and links newly 
    created group to corresponding session.
    
    args: 
        description: topic label for cluster
        included documents: documents included in group

    kwargs: 
        label: (string, arbitrary)
        color: (string, hex color)
        session_id: (string, represents ObjectId)
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle ObjectID kwargs
    session_id = ObjectId(str(session_id))
    userid = ObjectId(str(userid))
    
    # log action to stdout
    logging.info(f'Adding group {label} for'
                 f'workflow {session_id} and user {userid}.')
    #---------------------------------------------------------------------------

    # Creating document to be inserted into mongoDB
    obj = schemas.create_group_object(
        color, 
        documents, 
        label, 
        "Initialize group", 
        userid, 
        description, 
        session_id
    )
    
    # Initialize group in database
    groups_res = db.groups.insert_one(obj)
    
    # Add initialized group to session
    session = db.sessions.find_one({'_id': session_id})
    history_item = utils.update_history(
        item=session["history"][0],
        oid=groups_res.inserted_id,
        action=f"Initialize new group: {label}",
        user=userid,
    )
    
    sessions_res = utils.push_history(db, "sessions", session_id, history_item)    
    logging.info(f"Associated group {obj['history'][0]['label']} "
                 f"with session {session_id} and result {sessions_res}.")

    return groups_res.inserted_id
    
    
@app.task
def recolor_group(
    *args, database: str, userid: str,
    color: str, group_id: str,
    **kwargs) -> ObjectId:
    """
    Recolors a group.
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle ObjectID kwargs
    group_id = ObjectId(str(group_id))
    userid = ObjectId(str(userid))
    
    # log action to stdout
    logging.info(f'Recoloring group {group_id} to color {color} for '
                 f'user {userid}.')
    #---------------------------------------------------------------------------

    group = db.groups.find_one({"_id": group_id})
    history_item = utils.update_history(
        item=group["history"][0],
        color=color,
        action=f"Recolored group.",
        user=userid,
    )

    utils.push_history(db, "groups", group_id, history_item)
    return group_id


@app.task
def add_document_to_group(
    *args, database: str, userid: str,
    group_id: str, document_id: str,
    **kwargs):
    """
    Adds a document_id to a group.

    kwargs:
        group_id: (int, represents ObjectId for a group)
        document_id: (string, arbitrary)
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle ObjectID kwargs
    group_id = ObjectId(str(group_id))
    userid = ObjectId(str(userid))
    document_id = ObjectId(str(document_id))
    
    # log action to stdout
    logging.info(f'Adding document {document_id} to group {group_id} for '
                 f'user {userid}.')
    #---------------------------------------------------------------------------

    group = db.groups.find_one({'_id': group_id})
    documents = group["history"][0]["included_documents"]
    
    if document_id in documents or str(document_id) in documents:
        logging.info(f'Document {document_id} already in group {group["history"][0]["label"]}.')
        return
    else:
        documents.append(document_id),

    history_item = utils.update_history(
        item=group["history"][0],
        included_documents=documents,
        oid=document_id,
        action="Add document to group",
        user=userid
    )

    utils.push_history(db, "groups", group_id, history_item)
    return None


######### Refactored to here ###########

@app.task
def relabel_group(*args, **kwargs):
    """
    Relabels a group.
    """
    database = kwargs["database"]
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
def copy_group(*args, **kwargs):
    """
    copies a group

    kwargs:
        userid: (int, represents ObjectId for a group)
        label: (string, arbitrary)
        session_id:  (int, represent ObjectId for current session)
        group_id: (int, represent ObjectId for a group to be copies(
    """
    database = kwargs["database"]
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

    database = kwargs["database"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    session = db.sessions.find_one({'_id': session_id}, session=transaction_session)        
    history_item = session["history"][0]
    
    history_item["timestamp"] = datetime.datetime.utcnow()
    history_item["action"] = f"Remove group from session"
    history_item["user"] = user_id
    history_item["oid"] = group_id

    with transaction_session.start_transaction():
        db.groups.update_one({"_id": group_id}, {"$pull": {"sessions": session_id}})
        db.groups.update_one({"_id": group_id}, {"$set": {"cluster": []}})
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
    database = kwargs["database"]
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
def update_group_label(*args, **kwargs):
    """
    Update the label of the specified group_id.

    kwargs:
        group_id: (int, represents ObjectId for a group)
        label: (string, arbitrary)
    """    
    database = kwargs["database"]
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


################################################################################
# Projection tasks
################################################################################

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
    
    database = kwargs["database"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    cluster = db.clusters.find_one({"_id": cluster_id })
    session = db.sessions.find_one({"_id": session_id })

    obj = schemas.create_group_object(
        cluster["history"][0]["color"], 
        cluster["history"][0]["included_documents"], 
        cluster["history"][0]["label"], 
        "Copy cluster", 
        user_id, 
        cluster["history"][0]["description"], 
        session_id,
        cluster_id=[cluster_id])

    with transaction_session.start_transaction():
        group_res = db.groups.insert_one(obj, session=transaction_session)
        history_item = session["history"][0]
        history_item["groups"] = [*history_item["groups"], group_res.inserted_id]
        utils.push_history(db, "sessions", session_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)

    return group_res.inserted_id


@app.task
def remove_cluster(*args, **kwargs):
    """
    Delete a cluster (not the documents within) from the projection.
    kwargs:
        cluster_id: ObjectId
        projection_id: ObjectId
        user_id: ObjectId
    """
    c_id = ObjectId(str(kwargs["cluster_id"]))
    p_id = ObjectId(str(kwargs["projection_id"]))
    user_id = ObjectId(str(kwargs["userid"]))

    database = kwargs["database"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    projection = db.projections.find_one({'_id': p_id}, session=transaction_session)        
    history_item = projection["history"][0]
    
    history_item["timestamp"] = datetime.datetime.utcnow()
    history_item["action"] = f"Remove cluster from projection"
    history_item["user"] = user_id
    history_item["clusters"].remove(c_id)

    db.clusters.delete_one({"_id": c_id})
    utils.push_history(db, "projections", p_id, history_item, transaction_session)
    utils.commit_with_retry(transaction_session)
    logging.info(f"Removed cluster {c_id} from projection {p_id}.")

    return p_id


@app.task 
def initialize_projection(*args, **kwargs):
    """
    initialize a projection object
    """
    database = kwargs["database"]
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

        try:
            history_item["projections"].append(projection_res.inserted_id)
        except:
            history_item["projections"] = [projection_res.inserted_id] 

        history_item["timestamp"] = datetime.datetime.utcnow()
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
    import clustering
    projection_id = ObjectId(str(kwargs["projection_id"]))
    session_id = ObjectId(str(kwargs["session_id"]))
    user_id = ObjectId(str(kwargs["userid"]))

    database = kwargs["database"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    session = db.sessions.find_one({'_id': session_id}, session=transaction_session)        
    history_item = session["history"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()        
    history_item["projections"].remove(projection_id)
    history_item["action"] = f"Remove projection from session"
    history_item["user"] = user_id

    with transaction_session.start_transaction():
        
        cluster = clustering.Clustering(kwargs["userid"], [], kwargs["projection_id"], kwargs["session_id"], kwargs["database"])
        cluster.clean_mongodb() # cleans up clusters associate with projection
        db.projections.delete_one({'_id': projection_id}, session=transaction_session) 

        utils.push_history(db, "sessions", session_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)

@app.task
def relabel_projection(*args, **kwargs):
    """
    Relabels a projection.
    """
    database = kwargs["database"]
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
def cluster_by_groups(*args, **kwargs):
    """
    Cluster documents using user-provided group ids.

    kwargs:
        user_id: ObjectId
        group_id_strings: list(string) where the strings are MongoDB ObjectID format
        session_oid: string OID for session to add clusters to
    """
    import clustering
    logging.info(f'Starting clustering for groups {kwargs["group_id_strings"]} in session {kwargs["session_oid"]}.')
    cluster = clustering.Clustering(kwargs["userid"], kwargs["group_id_strings"], kwargs["projection_id"], kwargs["session_oid"], kwargs["database"])
    cluster.clustering_task()





################################################################################
# Teleoscope tasks
################################################################################


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
    database = kwargs["database"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle kwargs
    session_id = ObjectId(str(kwargs["session_id"]))
    userid = ObjectId(str(kwargs["userid"]))
    del kwargs["session_id"]
    del kwargs["userid"]

    teleoscope = schemas.create_teleoscope_object(session_id, userid, **kwargs)
    
    teleoscope_result = db.teleoscopes.insert_one(teleoscope)

    logging.info(f"New teleoscope id: {teleoscope_result.inserted_id}.")

    ui_session = db.sessions.find_one({'_id': session_id})
    history_item = ui_session["history"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()
    history_item["action"] = "Initialize Teleoscope"
    history_item["oid"] = teleoscope_result.inserted_id
    history_item["user"] = userid

    # associate the newly created teleoscope with correct session
    utils.push_history(db, "sessions", ObjectId(str(session_id)), history_item)
    return teleoscope_result.inserted_id


@app.task
def relabel_teleoscope(*args, **kwargs):
    """
    Relabels a teleoscope.
    """
    database = kwargs["database"]
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
    database = kwargs["database"]
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

    database = kwargs["database"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    session = db.sessions.find_one({'_id': session_id})        
    history_item = session["history"][0]

    history_item["timestamp"] = datetime.datetime.utcnow()        
    history_item["action"] = f"Remove teleoscope from session"
    history_item["user"] = user_id
    history_item["oid"] = teleoscope_id

    db.teleoscopes.update_one({"_id": teleoscope_id}, {"$pull": {"sessions": session_id}})
    
    utils.push_history(db, "sessions", session_id, history_item)
    return teleoscope_id




################################################################################
# Note tasks
################################################################################

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
    database = kwargs["database"]
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
    database = kwargs["database"]
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
def add_note(*args, **kwargs):
    """
    Adds a note to the notes collection.

    kwargs:
        id: document_id (string) 
    """    
    # Try finding document
    database = kwargs["database"]
    transaction_session, db = utils.create_transaction_session(db=database)
    label = kwargs["label"]
    content = kwargs["content"]

    session_id = ObjectId(str(kwargs["session_id"]))
    userid = ObjectId(str(kwargs["userid"]))

    text = " ".join([block["text"] for block in content["blocks"]])
    vector = vectorize_text(text)

    note = schemas.create_note_object(userid, label, content, vector)
    
    res = db.notes.insert_one(note)

    session = db.sessions.find_one({"_id": session_id})
    history_item = session["history"][0]
    history_item["user"] = userid,
    history_item["action"] = "Add note"
    history_item["notes"].append(res.inserted_id)
    utils.push_history(db, "sessions", session_id, history_item)
    logging.info(f"Added note with result {res}.")
    return res.inserted_id

@app.task
def remove_note(*args, **kwargs):
    """
    Removes a note from the session but NOT from the notes collection.

    kwargs:
        id: document_id (string) 
    """    
    # Try finding document
    database = kwargs["database"]
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

    
################################################################################
# Document importing tasks
################################################################################

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
    print("is this here")
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
    print("is this here 2")

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
    database = kwargs["database"]
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
    database = kwargs["database"]
    transaction_session, db = utils.create_transaction_session(db=database)
    if len(documents) > 0:
        target = db.documents
        with transaction_session.start_transaction():
            # Insert documents into database
            target.insert_many(documents, session=transaction_session)
            # Commit the session with retry
            utils.commit_with_retry(transaction_session)


################################################################################
# Misc/WIP tasks
################################################################################


@app.task
def snippet(*args, **kwargs):
    database = kwargs["database"]
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
def create_child(*args, **kwargs):
    """
    Add new child document to session.
    kwargs:
        start_index: (int, represents index from which you start slicing the parent document)
        end_index: (int, represents index from which you end slicing of the parent document)
        document_id: (int, represents ObjectId in int)
    """
    database = kwargs["database"]
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
def update_edges(*arg, **kwargs):
    """
    Updates the graph according to updated edges.
    
    database = kwargs["database"]
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
def mark(*args, **kwargs):
    database = kwargs["database"]
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
def add_item(*args, **kwargs):
    database = kwargs["database"]
    transaction_session, db = utils.create_transaction_session(db=database)

    userid = ObjectId(str(kwargs["userid"]))
    session_id = ObjectId(str(kwargs["session_id"]))

    uid  = kwargs["uid"]
    type = kwargs["type"]
    oid  = kwargs["oid"]

    match type:

        case "Group":

            # check to see if oid is valid 
            if ObjectId.is_valid(oid): 
                group = db.groups.find_one({"_id" : ObjectId(str(oid))})  
                
                if group: # oid is a group
                    logging.info(f"Group already exists.")
                    res = group["_id"]
                
                else: # oid is a cluster
                    cluster = db.groups.find_one({"cluster" : [ObjectId(str(oid))]})
                    
                    if cluster:
                        # oid is a cluster thats already copied as a group
                        logging.info(f"Cluster has already been copied.")
                        res = cluster["_id"]
                    else:
                        # oid is a cluster that has yet to be copied as a group
                        logging.info(f"Cluster has NOT been copied.")
                        res = copy_cluster(db=database, userid=userid, session_id=session_id, cluster_id=oid, transaction_session=transaction_session)
            else:
                # need to create a group
                logging.info(f"Group is new.")
                import random
                r = lambda: random.randint(0, 255)
                color = '#{0:02X}{1:02X}{2:02X}'.format(r(), r(), r()) 
                res = add_group(database=database, color=color, label="New Group", userid=userid, session_id=session_id, transaction_session=transaction_session)

            message(userid, {
                "oid": str(res),
                "uid": uid,
                "action": "OID_UID_SYNC",
                "description": "Associate OID with UID."
            })

        case "Teleoscope" | "Projection" | "Note":
            # If this already exists in the database, we can skip intitalization
            if ObjectId.is_valid(oid):

                docset = db.graph.find_one({"_id" : oid})
                if docset:
                    logging.info(f"{type} with {oid} already in DB.")
                    return # perhaps do something else before return like save?

                logging.info(f"return anyways for now")
                return

            logging.info(f"Received {type} with OID {oid} and UID {uid}.")

            match type:
                case "Teleoscope":
                    res = initialize_teleoscope(database=database, session_id=session_id, userid=userid)
                case "Projection": 
                    res = initialize_projection(database=database, session_id=session_id, label="New Projection", userid=userid)
                case "Note":
                    content = {
                        "blocks": [{
                            "key": "835r3",
                            "text": " ",
                            "type": "unstyled",
                            "depth": 0,
                            "inlineStyleRanges": [],
                            "entityRanges": [],
                            "data": {}
                        }],
                        "entityMap": {}
                    }         
                    res = add_note(database=database, session_id=session_id, label="New Note", content=content, userid=userid)

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


    return "Help"


def find_node(oid, db):
    _id = ObjectId(str(oid))
    doc = db.documents.find_one({"_id": _id})
    if doc:
        return doc
    
    group = db.groups.find_one({"_id": _id})
    if group:
        return group

    teleoscope = db.teleoscopes.find_one({"_id": _id})
    if teleoscope:
        return teleoscope
    
    projection = db.projections.find_one({"_id": _id})
    if projection:
        return projection
    
    return None

def graph(oid, db):
    # all_graph_items = db.graph.aggregate(pipeline = [{
    #     "$graphLookup": {
    #         "from": "graph",
    #         "startWith": {
    #             "$concatArrays": [
    #                 {
    #                     "$map": {
    #                         "input": "$edges.source",
    #                         "as": "sourceElem",
    #                         "in": "$$sourceElem.nodeid"
    #                     }
    #                 },
    #                 {
    #                     "$map": {
    #                         "input": "$edges.control",
    #                         "as": "controlElem",
    #                         "in": "$$controlElem.nodeid"
    #                     }
    #                 }
    #             ]
    #         },
    #         "connectFromField": "edges.source.nodeid",
    #         "connectToField": "_id",
    #         "as": "connected_nodes",
    #     }
    # }])
    
    node = db.graph.find_one({"_id": oid})
    # edges = node["edges"]

    # going wrong direction right now 
    # TODO: make sure this goes "right"
    query = db.graph.aggregate(pipeline = [{
        "$graphLookup": {
            "from": "graph",
            "startWith": [oid],
            "connectFromField": "edges.source.nodeid",
            "connectToField": "_id",
            "as": "connected_nodes",
        }
    }])
    return query

'''
list_of_docsets:
    {
        {
            docset_p1: [(doc, rank)]
        },
        {
            docset_p2: [(doc, rank)]
        }
    }


    id    |    rank   p1 p2 ...
    ----- |          
    oid_1 |    0.01   0  1  ...
    oid_2 |    0.99   1  0  ...

    ...

'''

def construct_matrix(count, item, item_type):
    return csc_matrix((count, 2), dtype=np.float32)

def ensure_node_exists(db, item_oid, item_type, collection_map):
    item = db.get_collection(collection_map[item_type]).find_one({"_id": item_oid})
    if "node" not in item:
        n = schemas.create_node(item_type)
        count = db.documents.count_documents({})
        csc = construct_matrix(count, item, item_type)
        csc_id = utils.cscUpload(db, "graph", csc)
        n["matrix"] = csc_id
        r = db.graph.insert_one(n)
        db.get_collection(collection_map[item_type]).update_one(
            {"_id": item_oid},
            {"$set": {"node": r.inserted_id}}
        )
        return db.get_collection(collection_map[item_type]).find_one({"_id": item_oid})
    return item

@app.task
def make_edge(*args, **kwargs):
    database = kwargs["database"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle kwargs
    userid = ObjectId(str(kwargs["userid"]))
    session_id = ObjectId(str(kwargs["session_id"]))
    
    source_node = kwargs["source_node"]
    source_oid  = ObjectId(str(source_node["data"]["oid"]))
    target_node = kwargs["target_node"]
    target_oid  = ObjectId(str(target_node["data"]["oid"]))
    handle_type = kwargs["handle_type"]

    connection = kwargs["connection"]
    ui_state = kwargs["ui_state"]

    collectionMap = {
        "Teleoscope": "teleoscopes",
        "Group": "groups",
        "Document": "documents",
        "Projection": "projections",
        "Intersection": "nodes",
        "Exclusion": "nodes",
        "Union": "nodes"
    }

    target_item = ensure_node_exists(db, target_oid, target_node["type"], collectionMap)
    source_item = ensure_node_exists(db, source_oid, source_node["type"], collectionMap)
    
    edge_add_result = db.graph.update_one(
        {
            "_id" : target_item["node"]
        },
        {
            "$addToSet": {
                f'edges.{handle_type}': {
                    "id": source_oid,
                    "nodeid": source_item["node"],
                    "type": source_node["type"]
                }
            }
        }
    )

    g = graph(edge_add_result.upserted_id, db)
    print(list(g))

    if target_node["type"] == "Teleoscope":
        docs = []
        n = db.graph.find_one({"_id": target_item["node"]})
        for input in n["edges"]["control"]:
            if input["type"] == "Document":
                doc = db.documents.find_one({"_id": input["id"]})
                if doc:
                    docs.append(doc)
            if input["type"] == "Group":
                group = db.groups.find_one({"_id": input["id"]})
                gdocs = group["history"][0]["included_documents"]
                for gdoc in gdocs:
                    doc = db.documents.find_one({"_id": ObjectId(str(gdoc))})
                    if doc:
                        docs.append(doc)

        if len(docs) != 0:        
            vec = np.average([d["textVector"] for d in docs], axis=0)
            ids, vecs = utils.get_documents(database)
            scores = utils.calculateSimilarity(vecs, vec)
            
            newRanks = utils.rankDocumentsBySimilarity(ids, scores)

            rank_slice = newRanks[0:1000]
            teleoscope = db.teleoscopes.find_one({"_id": target_item["_id"]})
            history_item = schemas.create_teleoscope_history_item(
                    label = teleoscope['history'][0]['label'],
                    reddit_ids=teleoscope['history'][0]['reddit_ids'],
                    positive_docs=docs,
                    negative_docs=[],
                    stateVector=vec.tolist(),
                    ranked_document_ids=target_item["node"],
                    rank_slice=rank_slice,
                    action="Reorient teleoscope",
                    user=ObjectId(str(userid))
                )
            
            # csc = utils.cscDownload(teleoscope['node'])
            logging.info(f'Number of ids: {len(ids)} and shape of csc:')
            
            utils.push_history(db, "teleoscopes", target_item["_id"], history_item)

    return edge_add_result

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

"dispatch.${userInfo.username}@%h"

if __name__ == '__main__':
    app.worker_main(['worker', '--loglevel=INFO', f"--hostname=tasks.{os.getlogin()}@%h" ])