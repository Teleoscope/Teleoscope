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
from . import graph


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
    *args, password: str, username: str, 
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
    transaction_session, db = utils.create_transaction_session(db="users")
    
    # log action to stdout
    logging.info(f"Adding user {username} to users.")
    #---------------------------------------------------------------------------
    
    # creating document to be inserted into mongoDB
    obj = schemas.create_user_object(username=username, password=password)
    users_res = db.users.insert_one(obj)

    return users_res.inserted_id

################################################################################
# Workspace tasks
################################################################################
@app.task
def initialize_workspace(
    *args, userid: str, label: str, datasource: str,
    **kwargs) -> ObjectId:
    """
    Initializes a workflow with userid as owner.
    """
    #---------------------------------------------------------------------------  
    # connect to database
    transaction_session, db = utils.create_transaction_session(db="users")
     
    # handle ObjectID kwargs
    userid = ObjectId(str(userid))

    # log action to stdout
    logging.info(f"Initializing workspace for user {userid}.")
    #---------------------------------------------------------------------------

    # Every workspace should be initialized with one workflow
    color = utils.random_color()
    
    obj = schemas.create_workspace_object(owner=userid, label=label, database=datasource)
    res = db.workspaces.insert_one(obj)

    workflow_id = initialize_workflow(
        database=datasource, 
        userid=userid, 
        label=label, 
        color=color, 
        workspace_id=res.inserted_id
    )
    
    return res.inserted_id


@app.task
def add_contributor(
    *args, workspace_id: str, userid: str, contributor: str,
    **kwargs) -> ObjectId:
    """
    Add new user to workspace's userlist. Provide read/write access.
    kwargs:
        contributor_id: OID of contributor to be added
    
    Returns:
        contributor_id
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db="users")
    
    # handle ObjectID kwargs
    workspace_id = ObjectId(str(workspace_id))
    userid = ObjectId(str(userid))
    contributor = db.users.find_one({"username": contributor})
    contributor_id = contributor["_id"]

    # log action to stdout
    logging.info(f'Adding contributor {contributor_id} by '
                 f'user {userid} to workspace {workspace_id}.')
    #---------------------------------------------------------------------------

    workspace = db.workspaces.find_one({"_id": workspace_id})    
    contributors = [c["id"] for c in workspace["contributors"]]

    # check if user has already been added
    if contributor_id in contributors or contributor_id == userid:
        logging.info(f'User {contributor_id} is already on userlist')
        raise Exception(f'User {contributor_id} is already on userlist')

    history_item = utils.update_history(
        item=workspace["history"][0],
        oid=contributor_id,
        action=f"Add contributor {contributor_id} to contributors for workspace {workspace_id}.",
        user=userid,
    )

    # add contributor to session's userlist
    db.workspaces.update_one(
        {"_id": workspace_id}, 
        {"$push": { 
            "contributors": {"id": contributor_id, "username": contributor["username"]}
        }, 
    })

    utils.push_history(db, "workspaces", workspace_id, history_item)

    return contributor_id


@app.task
def remove_contributor(
    *args, workspace_id: str, userid: str, contributor_id: str,
    **kwargs) -> ObjectId:
    """
    Add new user to workspace's userlist. Provide read/write access.
    kwargs:
        contributor_id: OID of contributor to be added
    
    Returns:
        contributor_id
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db="users")
    
    # handle ObjectID kwargs
    workspace_id = ObjectId(str(workspace_id))
    userid = ObjectId(str(userid))
    contributor_id = ObjectId(str(contributor_id))
    
    # log action to stdout
    logging.info(f'Removing contributor {contributor_id} by '
                 f'user {userid} to workspace {workspace_id}.')
    #---------------------------------------------------------------------------

    workspace = db.workspaces.find_one({"_id": workspace_id})    
    
    history_item = utils.update_history(
        item=workspace["history"][0],
        oid=contributor_id,
        action=f"Remove {contributor_id} from contributors.",
        user=userid,
    )

    # add contributor to session's userlist
    db.workspaces.update_one(
        {"_id": workspace_id}, 
        {"$pull": { 
            "contributors": { "id": contributor_id }
        }, 
    })

    utils.push_history(db, "workspaces", workspace_id, history_item)

    return contributor_id

################################################################################
# Workflow tasks
################################################################################

@app.task
def initialize_workflow(
    *args, database: str, userid: str, workspace_id: str, label: str, color: str, 
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
    workspace_id = ObjectId(str(workspace_id))
    
    # log action to stdout
    logging.info(f'Initializing workflow for user {userid}.')
    #---------------------------------------------------------------------------
    
    obj = schemas.create_workflow_object(
        userid=userid,
        label=label,
        color=color
    )

    result = db.sessions.insert_one(obj)

    user_db = utils.connect(db="users")

    user_db.workspaces.update_one(
        {"_id": workspace_id},
        {
            "$push": {
                "workflows": result.inserted_id
            }
        }
    )

    history_item = utils.update_history(
        item=schemas.create_workspace_history_object(userid),
        oid=result.inserted_id,
        userid=userid,
        action="Added session to workspace."
    )

    utils.push_history(user_db, "workspaces", workspace_id, history_item)

    return result.inserted_id


@app.task
def remove_workflow(
    *args, database: str, workspace_id: str, workflow_id: str, userid: str, 
    **kwargs) -> ObjectId:
    """
    Delete a workflow from the user. Workflow is not deleted from the whole 
    system, just the user.
    
    Returns:
        Removed workflow_id.
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)

    # handle ObjectID kwargs
    workflow_id = ObjectId(str(workflow_id))
    userid = ObjectId(str(userid))
    workspace_id = ObjectId(str(workspace_id))

    # log action to stdout
    logging.info(f'Removing workflow {workflow_id} for {userid}.')
    #---------------------------------------------------------------------------
    
    user_db = utils.connect(db="users")
    user_db.workspaces.update_one(
        workspace_id,
        {
            "$pop": {
                "workflows": workflow_id
            }
        }
    )

    history_item = utils.update_history(
        item=schemas.create_workspace_history_object(userid),
        oid=workflow_id,
        userid=userid,
        action="Remove session from workspace."
    )

    utils.push_history(user_db, "workspaces", workspace_id, history_item)

    return workflow_id


@app.task
def recolor_workflow(
    *args, database: str, workflow_id: str, userid: str, 
    color: str,
    **kwargs) -> ObjectId:
    """
    Recolors a workflow.

    Returns:
        Updated workflow_id.
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)

    # handle ObjectID kwargs
    workflow_id = ObjectId(str(workflow_id))
    userid = ObjectId(str(userid))
    
    # log action to stdout
    logging.info(f'Recoloring workflow to color '
                 f'{color} for {userid} and session {workflow_id}.')
    #---------------------------------------------------------------------------
    
    session = db.sessions.find_one({"_id": workflow_id})
    settings = session["history"][0]["settings"]
    settings["color"] = color
    history_item = utils.update_history(
        item=session["history"][0],
        settings=settings,
        userid=userid,
        action="Recolor workflow."
    )

    with transaction_session.start_transaction():
        utils.push_history(
            db, "sessions", workflow_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)
    return workflow_id


@app.task
def relabel_workflow(
    *args, database: str, workflow_id: str, userid: str, 
    label: str, relabeled_workflow_id: str, 
    **kwargs) -> ObjectId:
    """
    Relabels a session.
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)

    # handle ObjectID kwargs
    workflow_id = ObjectId(str(workflow_id))
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
    *args, database: str, workflow_id: str, userid: str,
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
        workflow_id
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle ObjectID kwargs
    workflow_id = ObjectId(str(workflow_id))
    userid = ObjectId(str(userid))

    # log action to stdout
    logging.info(f'Saving state for '
                 f'session {workflow_id} and user {userid}.')
    #---------------------------------------------------------------------------

    session = db.sessions.find_one({"_id": workflow_id})
    history_item = utils.update_history(
        item=session["history"][0],
        bookmarks=bookmarks,
        nodes=nodes,
        edges=edges,
        action="Save UI state",
        user=userid
    )
    utils.push_history(db, "sessions", workflow_id, history_item)

    return workflow_id

################################################################################
# Search tasks
################################################################################

@app.task
def add_search(
    *args, database: str, userid: str, workflow_id: str, query: str,
    **kwargs) -> ObjectId:
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle ObjectID kwargs
    workflow_id = ObjectId(str(workflow_id))
    userid = ObjectId(str(userid))
    
    # log action to stdout
    logging.info(f'Adding search {query} for'
                 f'workflow {workflow_id} and user {userid}.')
    #---------------------------------------------------------------------------
    obj = schemas.create_search_object(userid=userid, query=query)

    res = db.searches.insert_one(obj)
    
    return res.inserted_id


@app.task
def update_search(
    *args, database: str, userid: str, workflow_id: str, search_id: str, 
    query: str, **kwargs) -> ObjectId:
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle ObjectID kwargs
    workflow_id = ObjectId(str(workflow_id))
    userid = ObjectId(str(userid))
    search_id = ObjectId(str(search_id))
    
    # log action to stdout
    logging.info(f'Updating search {query} for'
                 f'workflow {workflow_id} and user {userid}.')
    #---------------------------------------------------------------------------
    search = db.searches.find_one(search_id)

    history_item = utils.update_history(
        item=schemas.create_search_history_object(userid=userid, query=query),
        action="Update search query.",
        query=query,
        user=userid
    )
    utils.push_history(db, "searches", search_id, history_item)
    
    # update graph
    if "node" not in search:
        node = graph.make_node(db, search_id, "Search")
        graph.graph(db, node["_id"])
    else:
        graph.graph(db, search["node"])

    return search_id


################################################################################
# Group tasks
################################################################################

@app.task 
def add_group(
    *args, database: str, userid: str, workflow_id: str, color: str, 
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
        workflow_id: (string, represents ObjectId)
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle ObjectID kwargs
    workflow_id = ObjectId(str(workflow_id))
    userid = ObjectId(str(userid))
    
    # log action to stdout
    logging.info(f'Adding group {label} for'
                 f'workflow {workflow_id} and user {userid}.')
    #---------------------------------------------------------------------------

    # Creating document to be inserted into mongoDB
    obj = schemas.create_group_object(
        color, 
        documents, 
        label, 
        "Initialize group", 
        userid, 
        description, 
        workflow_id
    )
    
    # Initialize group in database
    groups_res = db.groups.insert_one(obj)
    
    # Add initialized group to session
    session = db.sessions.find_one({'_id': workflow_id})
    history_item = utils.update_history(
        item=session["history"][0],
        oid=groups_res.inserted_id,
        action=f"Initialize new group: {label}",
        user=userid,
    )
    
    sessions_res = utils.push_history(db, "sessions", workflow_id, history_item)    
    logging.info(f"Associated group {obj['history'][0]['label']} "
                 f"with session {workflow_id} and result {sessions_res}.")

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
    
    # update graph
    if "node" not in group:
        node = graph.make_node(db, group_id, "Group")
        graph.graph(db, node["_id"])
    else:
        graph.graph(db, group["node"])

    

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
        workflow_id:  (int, represent ObjectId for current session)
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

    workflow_id_str = kwargs["workflow_id"]
    workflow_id = ObjectId(str(workflow_id_str))
    session = db.sessions.find_one({"_id": workflow_id})

    group_id = ObjectId(kwargs["group_id"])
    group_to_copy = db.groups.find_one({'_id': group_id})
    group_copy_history = group_to_copy["history"][0]
    color = group_copy_history["color"]
    included_documents = group_copy_history["included_documents"]

    print(f'Copying ({group_id}) as new group named: {label}')

    # create a new group for the session
    group_new_id = add_group(userid=userid, label=label, color=color, workflow_id=workflow_id_str)
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

    logging.info(f'Update new group data')

    return None


@app.task
def remove_group(*args, **kwargs):
    """
    Delete a group (not the documents within) from the session. Group is not deleted from the whole system, just the session.
    kwargs:
        group_id: ObjectId
        workflow_id: ObjectId
        user_id: ObjectId
    """
    group_id = ObjectId(str(kwargs["group_id"]))
    workflow_id = ObjectId(str(kwargs["workflow_id"]))
    user_id = ObjectId(str(kwargs["userid"]))

    database = kwargs["database"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    session = db.sessions.find_one({'_id': workflow_id}, session=transaction_session)        
    history_item = session["history"][0]
    
    history_item["timestamp"] = datetime.datetime.utcnow()
    history_item["action"] = f"Remove group from session"
    history_item["user"] = user_id
    history_item["oid"] = group_id

    with transaction_session.start_transaction():
        db.groups.update_one({"_id": group_id}, {"$pull": {"sessions": workflow_id}})
        db.groups.update_one({"_id": group_id}, {"$set": {"cluster": []}})
        utils.push_history(db, "sessions", workflow_id, history_item, transaction_session) 
        utils.commit_with_retry(transaction_session)
        logging.info(f"Removed group {group_id} from session {workflow_id}.")

    return workflow_id


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
    group_id = ObjectId(str(kwargs["group_id"]))
    document_id = ObjectId(str(kwargs["document_id"]))

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
    
    # update graph
    if "node" not in group:
        node = graph.make_node(db, group_id, "Group")
        graph.graph(db, node["_id"])
    else:
        graph.graph(db, group["node"])

        
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
        workflow_id: (str) the session to copy to
        user_id: (str) the user commiting the action
        
    """

    cluster_id = ObjectId(str(kwargs["cluster_id"]))
    workflow_id = ObjectId(str(kwargs["workflow_id"]))
    user_id = ObjectId(str(kwargs["userid"]))
    
    database = kwargs["database"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    cluster = db.clusters.find_one({"_id": cluster_id })
    session = db.sessions.find_one({"_id": workflow_id })

    obj = schemas.create_group_object(
        cluster["history"][0]["color"], 
        cluster["history"][0]["included_documents"], 
        cluster["history"][0]["label"], 
        "Copy cluster", 
        user_id, 
        cluster["history"][0]["description"], 
        workflow_id,
        cluster_id=[cluster_id])

    with transaction_session.start_transaction():
        group_res = db.groups.insert_one(obj, session=transaction_session)
        history_item = session["history"][0]
        history_item["groups"] = [*history_item["groups"], group_res.inserted_id]
        utils.push_history(db, "sessions", workflow_id, history_item, transaction_session)
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
    workflow_id = ObjectId(str(kwargs["workflow_id"]))
    userid = kwargs["userid"]
    
    user = db.users.find_one({"_id": ObjectId(str(userid))})
    user_id = "1"
    if user != None:
        user_id = user['_id']

    obj = schemas.create_projection_object(workflow_id, label, user_id)

    with transaction_session.start_transaction():

        projection_res = db.projections.insert_one(obj, session=transaction_session)
        logging.info(f"Added projection {obj['history'][0]['label']} with result {projection_res}.")
        
        session = db.sessions.find_one({'_id': workflow_id}, session=transaction_session)
        if not session:
            logging.info(f"Warning: session with id {workflow_id} not found.")
            raise Exception(f"session with id {workflow_id} not found")
        

        history_item = session["history"][0]

        try:
            history_item["projections"].append(projection_res.inserted_id)
        except:
            history_item["projections"] = [projection_res.inserted_id] 

        history_item["timestamp"] = datetime.datetime.utcnow()
        history_item["action"] = f"Initialize new projection: {label}"
        history_item["user"] = user_id

        sessions_res = utils.push_history(db, "sessions", workflow_id, history_item, transaction_session)
        
        logging.info(f"Associated projection {obj['history'][0]['label']} with session {workflow_id} and result {sessions_res}.")
        utils.commit_with_retry(transaction_session)
        return projection_res.inserted_id
    
@app.task
def remove_projection(*args, **kwargs):
    """
    Delete a projection and associated clusters
    """
    import clustering
    projection_id = ObjectId(str(kwargs["projection_id"]))
    workflow_id = ObjectId(str(kwargs["workflow_id"]))
    user_id = ObjectId(str(kwargs["userid"]))

    database = kwargs["database"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    session = db.sessions.find_one({'_id': workflow_id}, session=transaction_session)        
    history_item = session["history"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()        
    history_item["projections"].remove(projection_id)
    history_item["action"] = f"Remove projection from session"
    history_item["user"] = user_id

    with transaction_session.start_transaction():
        
        cluster = clustering.Clustering(kwargs["userid"], [], kwargs["projection_id"], kwargs["workflow_id"], kwargs["database"])
        cluster.clean_mongodb() # cleans up clusters associate with projection
        db.projections.delete_one({'_id': projection_id}, session=transaction_session) 

        utils.push_history(db, "sessions", workflow_id, history_item, transaction_session)
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
        workflow_id: string
        label: string (optional)
    """
    database = kwargs["database"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle kwargs
    workflow_id = ObjectId(str(kwargs["workflow_id"]))
    userid = ObjectId(str(kwargs["userid"]))
    del kwargs["workflow_id"]
    del kwargs["userid"]

    teleoscope = schemas.create_teleoscope_object(workflow_id, userid, **kwargs)
    
    teleoscope_result = db.teleoscopes.insert_one(teleoscope)

    logging.info(f"New teleoscope id: {teleoscope_result.inserted_id}.")

    ui_session = db.sessions.find_one({'_id': workflow_id})
    history_item = ui_session["history"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()
    history_item["action"] = "Initialize Teleoscope"
    history_item["oid"] = teleoscope_result.inserted_id
    history_item["user"] = userid

    # associate the newly created teleoscope with correct session
    utils.push_history(db, "sessions", ObjectId(str(workflow_id)), history_item)
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
        workflow_id: ObjectId
        user_id: ObjectId
    """
    teleoscope_id = ObjectId(str(kwargs["teleoscope_id"]))
    workflow_id = ObjectId(str(kwargs["workflow_id"]))
    user_id = ObjectId(str(kwargs["userid"]))

    database = kwargs["database"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    session = db.sessions.find_one({'_id': workflow_id})        
    history_item = session["history"][0]

    history_item["timestamp"] = datetime.datetime.utcnow()        
    history_item["action"] = f"Remove teleoscope from session"
    history_item["user"] = user_id
    history_item["oid"] = teleoscope_id

    db.teleoscopes.update_one({"_id": teleoscope_id}, {"$pull": {"sessions": workflow_id}})
    
    utils.push_history(db, "sessions", workflow_id, history_item)
    return teleoscope_id




################################################################################
# Note tasks
################################################################################

@app.task
def add_note(*args, database: str, userid: str, workflow_id: str,
    label: str, content, **kwargs) -> ObjectId:
    """
    Adds a note to the note collection.
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle ObjectID kwargs
    workflow_id = ObjectId(str(workflow_id))
    userid = ObjectId(str(userid))
    
    # log action to stdout
    logging.info(f'Adding note {label} for'
                 f'workflow {workflow_id} and user {userid}.')
    #---------------------------------------------------------------------------

    note = schemas.create_note_object(
        workflow_id, 
        userid, 
        label, 
        "", 
        content, 
        list(np.zeros(512))
    )

    res = db.notes.insert_one(note)
    
    workflow = db.sessions.find_one({"_id": workflow_id})
    
    history_item = utils.update_history(
        item=workflow["history"][0],
        user=userid,
        action="Add note.",
        oid=res.inserted_id
    )

    utils.push_history(db, "sessions", workflow_id, history_item)
    logging.info(f"Added note with result {res}.")
    return res.inserted_id


@app.task
def update_note(*args, database: str, userid: str, workflow_id: str,
    note_id: str, content, **kwargs) -> ObjectId:
    """
    Updates a note content.
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle ObjectID kwargs
    workflow_id = ObjectId(str(workflow_id))
    userid = ObjectId(str(userid))
    note_id = ObjectId(str(note_id))
    
    # log action to stdout
    logging.info(f'Updating note {note_id} for'
                 f'workflow {workflow_id} and user {userid}.')
    #---------------------------------------------------------------------------


    note = db.notes.find_one({"_id": note_id})
    history_item = utils.update_history(
        item=note["history"][0],
        user=userid,
        action="Update note content.",
        content=content
    )

    res = utils.push_history(db, "notes", note_id, history_item)
    
    text = " ".join([block["text"] for block in content["blocks"]])
    vector = vectorize_text(text)
    logging.info(f"Vectorized note with text: {text}.")
    
    db.notes.update_one({"_id": note_id}, {"$set": { "textVector": vector, "text": text }})
    logging.info(f"Updated note {note_id} with {res}.")

@app.task
def relabel_note(*args, database: str, userid: str, workflow_id: str,
    note_id: str, label: str, **kwargs) -> ObjectId:
    """
    Relabels a note.
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle ObjectID kwargs
    workflow_id = ObjectId(str(workflow_id))
    userid = ObjectId(str(userid))
    note_id = ObjectId(str(note_id))
    
    # log action to stdout
    logging.info(f'Updating note {note_id} for'
                 f'workflow {workflow_id} and user {userid}.')
    #---------------------------------------------------------------------------
    note = db.notes.find_one({"_id": note_id})
    history_item = utils.update_history(
        item=note["history"][0],
        user=userid,
        action="Update note label.",
        label=label
    )

    res = utils.push_history(db, "notes", note_id, history_item)
    logging.info(f"Updated note {note_id} with {res} and label {label}.")


@app.task
def remove_note(*args, database: str, userid: str, workflow_id: str,
    note_id: str, **kwargs) -> ObjectId:
    """
    Removes a note from the workflow but not the notes collection.
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle ObjectID kwargs
    workflow_id = ObjectId(str(workflow_id))
    userid = ObjectId(str(userid))
    note_id = ObjectId(str(note_id))
    
    # log action to stdout
    logging.info(f'Removing note {note_id} from'
                 f'workflow {workflow_id} by user {userid}.')
    #---------------------------------------------------------------------------

    workflow = db.sessions.find_one({"_id": workflow_id})

    db.notes.update_one({"_id": note_id}, {"$pull": {"workflows": workflow_id}})

    history_item = utils.update_history(
        item=workflow["history"][0],
        user=userid,
        action="Remove note from workflow.",
        oid=note_id
    )

    utils.push_history(db, "sessions", workflow_id, history_item)

    logging.info(f"Removed note {note_id} from session {workflow_id}.")

    
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

    workflow_id = ObjectId(str(kwargs["workflow_id"]))
    userid = ObjectId(str(kwargs["userid"]))
    document_id =  ObjectId(str(kwargs["document_id"]))
    text = kwargs["text"]
    
    snip = {
        "document_id": document_id,
        "userid": userid,
        "text": text,
        "vector": vectorize_text([text])
    }
    session = db.sessions.find_one({"_id": workflow_id})
    history_item = session["history"][0]
    history_item["user"] = userid
    history_item["action"] = f"Add snippet for session {workflow_id} and document {document_id}."

    with transaction_session.start_transaction():
        utils.push_history(db, "sessions", workflow_id, history_item, transaction_session)
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
    Deprecated.
    """
    pass
    
    
@app.task
def mark(*args, **kwargs):
    database = kwargs["database"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    userid      = ObjectId(str(kwargs["userid"]))
    document_id = ObjectId(str(kwargs["document_id"]))
    workflow_id  = ObjectId(str(kwargs["workflow_id"]))
    read        = kwargs["read"]
    session     = db.sessions.find_one({"_id": workflow_id})
    history_item = session["history"][0]
    history_item["userid"] = userid
    history_item["action"] = f"Mark document read set to {read}."

    with transaction_session.start_transaction():
        db.documents.update_one({"_id": document_id}, {"$set": {"state.read": read}})        
        utils.push_history(db, "teleoscopes", workflow_id, history_item, transaction_session)
        utils.commit_with_retry(transaction_session)


@app.task
def add_item(*args, **kwargs):
    database = kwargs["database"]
    transaction_session, db = utils.create_transaction_session(db=database)

    replyTo = kwargs["replyTo"]
    userid = ObjectId(str(kwargs["userid"]))
    workflow_id = ObjectId(str(kwargs["workflow_id"]))

    uid  = kwargs["uid"]
    node_type = kwargs["type"]
    oid  = kwargs["oid"]

    match node_type:

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
                        res = copy_cluster(db=database, userid=userid, workflow_id=workflow_id, cluster_id=oid, transaction_session=transaction_session)
            else:
                # need to create a group
                logging.info(f"Group is new.")
                color = utils.random_color()
                res = add_group(database=database, color=color, label="New Group", userid=userid, workflow_id=workflow_id, transaction_session=transaction_session)

            utils.message(replyTo, {
                "oid": str(res),
                "uid": uid,
                "action": "OID_UID_SYNC",
                "description": "Associate OID with UID."
            })
        
        case "Search":
            if ObjectId.is_valid(oid): 
                search = db.searches.find_one({"_id" : ObjectId(str(oid))})  
                
                if search: # oid is a search
                    logging.info(f"Search already exists.")
                    res = search["_id"]
            else:
                # need to create a search
                logging.info(f"Search is new.")
                res = add_search(
                    database=database, 
                    userid=userid, 
                    workflow_id=workflow_id, 
                    query="", 
                    transaction_session=transaction_session
                )

            utils.message(replyTo, {
                "oid": str(res),
                "uid": uid,
                "action": "OID_UID_SYNC",
                "description": "Associate OID with UID."
            })
        
        case "Search":
            if ObjectId.is_valid(oid): 
                search = db.searches.find_one({"_id" : ObjectId(str(oid))})  
                
                if search: # oid is a search
                    logging.info(f"Search already exists.")
                    res = search["_id"]
            else:
                # need to create a group
                logging.info(f"Search is new.")
                res = add_search(database=database, userid=userid, workflow_id=workflow_id, query="", transaction_session=transaction_session)

            utils.message(replyTo, {
                "oid": str(res),
                "uid": uid,
                "action": "OID_UID_SYNC",
                "description": "Associate OID with UID."
            })


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
            res = add_note(
                database=database, 
                workflow_id=workflow_id, 
                label="New Note", 
                content=content, 
                userid=userid
            )

            utils.message(replyTo, {
                "oid": str(res),
                "uid": uid,
                "action": "OID_UID_SYNC",
                "description": f"Associated OID for {node_type} with UID."
            })

        case "Projection":
            # If this already exists in the database, we can skip intitalization
            if ObjectId.is_valid(oid):

                docset = db.graph.find_one({"_id" : oid})
                if docset:
                    logging.info(f"{type} with {oid} already in DB.")
                    return # perhaps do something else before return like save?

                logging.info(f"return anyways for now")
                return

            logging.info(f"Received {type} with OID {oid} and UID {uid}.")

            res = initialize_projection(database=database, workflow_id=workflow_id, label="New Projection", userid=userid)

            utils.message(replyTo, {
                "oid": str(res),
                "uid": uid,
                "action": "OID_UID_SYNC",
                "description": "Associate OID with UID."
            })            

        case "Teleoscope" | "Filter" | "Intersection" | "Exclusion" | "Union":
            node = graph.make_node(db, None, node_type)

            utils.message(replyTo, {
                "oid": str(node["_id"]),
                "uid": uid,
                "action": "OID_UID_SYNC",
                "description": f"Associated OID for {node_type} with UID."
            })
    return 


@app.task
def make_edge(*args, **kwargs):
    database = kwargs["database"]
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle kwargs
    userid = ObjectId(str(kwargs["userid"]))
    workflow_id = ObjectId(str(kwargs["workflow_id"]))
    
    source_node = kwargs["source_node"]
    source_type = source_node["type"]
    source_oid  = ObjectId(str(source_node["data"]["oid"]))
    target_node = kwargs["target_node"]
    target_type = target_node["type"]
    target_oid  = ObjectId(str(target_node["data"]["oid"]))
    edge_type = kwargs["handle_type"] # source or control

    graph.make_edge(db, source_oid, source_type, target_oid, target_type, edge_type)
    
    return 200


@app.task
def ping(*args, database: str, userid: str, message: str, replyTo: str, **kwargs):
    
    userid = ObjectId(str(userid))
                      
    msg = f"ping queue for user {userid} and database {database} with {kwargs}"
    logging.info(f"Received a ping: {message}")

    utils.message(replyTo, msg)

"dispatch.${userInfo.username}@%h"

if __name__ == '__main__':
    app.worker_main(['worker', '--loglevel=INFO', f"--hostname=tasks.{os.getlogin()}@%h" ])