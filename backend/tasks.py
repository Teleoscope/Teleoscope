import logging, json, numpy as np
import uuid
from warnings import simplefilter
from celery import Celery
from bson.objectid import ObjectId
from kombu import  Exchange, Queue
from typing import List
import os
import itertools
import pandas as pd

# local imports
from . import utils
from . import schemas
from . import graph
from backend.embeddings import milvus_import

# environment variables
from dotenv import load_dotenv
load_dotenv()  # This loads the variables from .env
import os
RABBITMQ_USERNAME = os.getenv('RABBITMQ_USERNAME') 
RABBITMQ_PASSWORD = os.getenv('RABBITMQ_PASSWORD') 
RABBITMQ_HOST = os.getenv('RABBITMQ_HOST') 
RABBITMQ_VHOST = os.getenv('RABBITMQ_VHOST') 
RABBITMQ_TASK_QUEUE = os.getenv('RABBITMQ_TASK_QUEUE') 

# ignore all future warnings
simplefilter(action='ignore', category=FutureWarning)


# url: "amqp://myuser:mypassword@localhost:5672/myvhost"
CELERY_BROKER_URL = (
    f'amqp://'
    f'{RABBITMQ_USERNAME}:'
    f'{RABBITMQ_PASSWORD}@'
    f'{RABBITMQ_HOST}/'
    f'{RABBITMQ_VHOST}'
)

queue = Queue(RABBITMQ_TASK_QUEUE, Exchange(RABBITMQ_TASK_QUEUE), RABBITMQ_TASK_QUEUE)
app = Celery('tasks', backend='rpc://', broker=CELERY_BROKER_URL)

app.conf.update(
    task_serializer='pickle',
    accept_content=['pickle', 'json'],  # Ignore other content
    result_serializer='pickle',
    task_queues=[queue],
    worker_concurrency=4,
    worker_max_memory_per_child = 4000000
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
    Initializes a workspace with userid as owner.
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

    uuid_str = str(uuid.uuid4()).replace('-', '_')

    dbname = utils.sanitize_db_name(f"{label}_{uuid_str}")

    if datasource == "aita" or datasource == "nursing":
        dbname = datasource
    
    obj = schemas.create_workspace_object(owner=userid, label=label, database=dbname)
    res = db.workspaces.insert_one(obj)

    workflow_id = initialize_workflow(
        database=dbname,
        userid=userid,
        label=label,
        color=color,
        workspace_id=res.inserted_id
    )
    
    return res.inserted_id

@app.task
def remove_user_from_workspace(
    *args, userid: str, workspace_id: str,
    **kwargs) -> ObjectId:
    """
    Removes a workspace with userid as owner. 
    Doesn't delete corresponding workflows.

    """
    #---------------------------------------------------------------------------  
    # connect to database
    transaction_session, db = utils.create_transaction_session(db="users")
     
    # handle ObjectID kwargs
    userid = ObjectId(str(userid))
    workspace_id = ObjectId(str(workspace_id))

    # log action to stdout
    logging.info(f"Removing user {userid} from workspace {workspace_id}.")
    #---------------------------------------------------------------------------
    workspace = db.workspaces.find_one({"_id": workspace_id})
    

    if workspace["owner"] == userid:
        workspace["owner"] = None
    
    workspace["contributors"] = [c for c in workspace["contributors"] if c["id"] != userid]

    if workspace["owner"] == None:
        if len(workspace["contributors"]) > 0:
            workspace["owner"] = workspace["contributors"][0]["id"]

    history_item = utils.update_history(
        item=workspace,
        oid=userid,
        action=f"Removed contributor {userid} from workspace {workspace_id}.",
        user=userid,
    )

    # add contributor to session's userlist
    db.workspaces.update_one(
        {"_id": workspace_id}, 
        { 
            "$set":
                {
                    "contributors": workspace["contributors"],
                    "owner": workspace["owner"]
                }
        }, 
    )

    utils.push_history(db, "workspaces", workspace_id, history_item)

    return userid


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
        action="Added workflow to workspace."
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
    logging.info(f'Removing workflow {workflow_id} for user {userid}.')
    #---------------------------------------------------------------------------
    
    user_db = utils.connect(db="users")
    user_db.workspaces.update_one(
        {"_id" : workspace_id},
        {
            "$pull": {
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

    utils.push_history(db, "sessions", workflow_id, history_item)
        
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
    
    # update all graph items
    nodes = db.graph.find({"reference": search_id})
    for node in nodes:
        graph.graph(db, node["_id"])

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
        [ObjectId(str(d)) for d in documents],
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
def add_document_to_group( *args, database: str, userid: str,
    group_id: str, document_id: str, **kwargs):
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
    
    # update all graph items
    nodes = db.graph.find({"reference": group_id})
    for node in nodes:
        graph.graph(db, node["_id"])

    return None


######### Refactored to here ###########

@app.task
def relabel_group(*args, database: str, userid: str, 
                  group_id: str, label: str, **kwargs):
    """
    Relabels a group.
    """
    
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)

    # handle ObjectID kwargs
    group_id = ObjectId(str(group_id))
    userid = ObjectId(str(userid))

    # log action to stdout
    logging.info(f'Relabelling group {group_id} to {label} for '
                 f'user {userid}.')
    #---------------------------------------------------------------------------

    group = db.groups.find_one({"_id": group_id})

    history_item = utils.update_history(
        item=group["history"][0],
        label=label,
        userid=userid,
        action="Relabeled group."
    )

    utils.push_history(db, "groups", group_id, history_item)
    return 200


@app.task
def copy_group(*args, database: str, userid: str, workflow_id: str,
               group_id: str, label: str, **kwargs):
    """
    copies a group

    kwargs:
        userid: (int, represents ObjectId for a group)
        label: (string, arbitrary)
        workflow_id:  (int, represent ObjectId for current session)
        group_id: (int, represent ObjectId for a group to be copies(
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle ObjectID kwargs
    group_id = ObjectId(str(group_id))
    userid = ObjectId(str(userid))
    workflow_id = ObjectId(str(workflow_id))
    
    # log action to stdout
    logging.info(f'Copying group {group_id} to {label} for '
                 f'user {userid}.')
    #---------------------------------------------------------------------------
    
    group_to_copy = db.groups.find_one({'_id': group_id})
    group_copy_history = group_to_copy["history"][0]
    

    color = group_copy_history["color"]
    included_documents = group_copy_history["included_documents"]

    # create a new group for the session
    group_new_id = add_group(
        database=database,
        userid=userid, 
        label=label, 
        color=color, 
        workflow_id=workflow_id, 
        documents=included_documents
    )

    workflow = db.sessions.find_one({"_id": workflow_id})
    
    history_item = utils.update_history(
        item=workflow["history"][0],
        label=label,
        userid=userid,
        oid=group_new_id,
        action="Copied group."
    )

    utils.push_history(db, "sessions", workflow_id, history_item)

    return None


@app.task
def remove_group(*args, database: str, group_id: str, workflow_id: str, userid: str, **kwargs):
    """
    Delete a group (not the documents within) from the session. 
    Group is not deleted from the whole system, just the session.
    kwargs:
        group_id: ObjectId
        workflow_id: ObjectId
        user_id: ObjectId
    """
    
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)

    # handle ObjectID kwargs
    group_id = ObjectId(str(group_id))
    workflow_id = ObjectId(str(workflow_id))
    userid = ObjectId(str(userid))

    # log action to stdout
    logging.info(f'Removing group {group_id} from workflow {workflow_id} for '
                 f'user {userid}.')
    #---------------------------------------------------------------------------
    
    workflow = db.sessions.find_one({"_id": workflow_id})
    history_item = utils.update_history(
        item=workflow["history"][0],
        userid=userid,
        oid=group_id,
        action="Remove group."
    )

    db.groups.update_one({"_id": group_id}, {"$pull": {"sessions": workflow_id}})
    db.groups.update_one({"_id": group_id}, {"$set": {"cluster": []}})
    utils.push_history(db, "sessions", workflow_id, history_item)

    return workflow_id


@app.task
def remove_document_from_group(*args, database: str, group_id: str, document_id: str, userid: str, **kwargs):
    """
    Remove the document_id from the included_documents of the specified group_id.

    kwargs:
        group_id (int, represents ObjectId for a group)
        document_id (string, arbitrary)
    """

    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle ObjectID kwargs
    group_id = ObjectId(str(group_id))
    document_id = ObjectId(str(document_id))
    userid = ObjectId(str(userid))

    # log action to stdout
    logging.info(f'Removing document {document_id} from group {group_id} for '
                 f'user {userid}.')
    #---------------------------------------------------------------------------

    group = db.groups.find_one({'_id': group_id})
    docs = group["history"][0]["included_documents"]

    docs.remove(document_id)

    history_item = utils.update_history(
        item=group["history"][0],
        userid=userid,
        oid=group_id,
        included_documents=docs,
        action="Remove group."
    )
    utils.push_history(db, "groups", group_id, history_item)

    # update all graph items
    nodes = db.graph.find({"reference": group_id})
    for node in nodes:
        graph.graph(db, node["_id"])

    return


@app.task
def copy_doclists_to_groups(*args, database: str, workflow_id: str, node_id: str, userid: str, **kwargs):

    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)

    # handle ObjectID kwargs
    node_id = ObjectId(str(node_id))
    workflow_id = ObjectId(str(workflow_id))
    userid = ObjectId(str(userid))

    # log action to stdout
    logging.info(f'Copying doclists from {node_id} to groups for '
                 f'user {userid}.')
    #---------------------------------------------------------------------------

    node = db.graph.find_one({"_id": node_id})
    
    acc = 0
    for doclist in node["doclists"]:
        acc = acc + 1
        included_documents = [d[0] for d in doclist["ranked_documents"]]

        # create a new group for the session
        group_new_id = add_group(
            database=database,
            userid=userid, 
            label=f'Group {acc} from graph item', 
            color=utils.random_color(), 
            workflow_id=workflow_id, 
            documents=included_documents
        )

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
    utils.add_chromadb(database, ids=[res.inserted_id], texts=[""])
    
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
    
    # Ensure mongodb is updated
    db.notes.update_one({"_id": note_id}, {"$set": { "text": text }})
    logging.info(f"Updated note {note_id} with {res}.")
    
    # Ensure embedding is updated
    utils.update_chromadb(database, [note_id], text)
    logging.info(f"Updating note {note_id} embedding.")

    


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
# Graph tasks
################################################################################

@app.task
def update_node(*args, database: str, userid: str, workflow_id: str,
    node_id, parameters, **kwargs):
    """
    Updates node parameters.
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle ObjectID kwargs
    workflow_id = ObjectId(str(workflow_id))
    userid = ObjectId(str(userid))
    
    # log action to stdout
    logging.info(f'Updating parameters for node in '
                 f'workflow {workflow_id} by user {userid}.')
    #---------------------------------------------------------------------------
    
    node_oid  = ObjectId(str(node_id))
    node = db.graph.find_one(node_oid)
    
    if (node == None):
        raise Exception("Node is None.")
    
    graph.update_parameters(db, node, parameters)
    graph.graph(db, node_oid)

    workflow = db.sessions.find_one({"_id": workflow_id})
    history_item = utils.update_history(
        item=workflow["history"][0],
        action=f"update node {node_oid}.",
        user=userid,
    )

    utils.push_history(db, "sessions", workflow_id, history_item)
    
    return 200

@app.task
def make_edge(*args, database: str, userid: str, workflow_id: str,
    source_node, target_node, edge_type: str, **kwargs):
    """
    Makes an edge between two nodes.
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle ObjectID kwargs
    workflow_id = ObjectId(str(workflow_id))
    userid = ObjectId(str(userid))
    
    # log action to stdout
    logging.info(f'Making edge type {edge_type} for '
                 f'workflow {workflow_id} by user {userid}.')
    #---------------------------------------------------------------------------
    
    source_type = source_node["type"]
    source_oid  = ObjectId(str(source_node["data"]["nodeid"]))
    
    target_type = target_node["type"]
    target_oid  = ObjectId(str(target_node["data"]["nodeid"]))
    
    graph.make_edge(db, workflow_id, source_oid, source_type, target_oid, target_type, edge_type)

    workflow = db.sessions.find_one({"_id": workflow_id})
    history_item = utils.update_history(
        item=workflow["history"][0],
        action=f"Add edge from {source_type} {source_oid} to {target_type} {target_oid} {edge_type}.",
        user=userid,
    )

    utils.push_history(db, "sessions", workflow_id, history_item)
    
    return 200

@app.task
def remove_edge(*args, database: str, userid: str, workflow_id: str, 
    edge, **kwargs):
    """
    Removes an edge.
    """
    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle ObjectID kwargs
    workflow_id = ObjectId(str(workflow_id))
    userid = ObjectId(str(userid))
    
    # log action to stdout
    logging.info(f'Removing edge {edge} from'
                 f'workflow {workflow_id} by user {userid}.')
    #---------------------------------------------------------------------------

    
    source_oid = ObjectId(str(edge["source"].split("%")[0]))
    source_type = edge["source"].split("%")[-1].capitalize()

    target_oid = ObjectId(str(edge["target"].split("%")[0]))
    target_type = edge["target"].split("%")[-1].capitalize()
    
    edge_type = edge["targetHandle"].split("_")[-1]
    
    graph.remove_edge(db, source_oid, target_oid, edge_type)


    workflow = db.sessions.find_one({"_id": workflow_id})
    history_item = utils.update_history(
        item=workflow["history"][0],
        action=f"Remove edge from {source_type} {source_oid} to {target_type} {target_oid} {edge_type}.",
        user=userid,
    )

    utils.push_history(db, "sessions", workflow_id, history_item)
    
    return 200


@app.task
def add_item(*args, database: str, userid: str, replyTo: str, workflow_id: str,
             uid: str, node_type: str, oid: str, **kwargs) -> ObjectId:
    """Add graph item."""

    #---------------------------------------------------------------------------
    # connect to database
    transaction_session, db = utils.create_transaction_session(db=database)
    
    # handle ObjectID kwargs
    userid = ObjectId(str(userid))
    workflow_id = ObjectId(str(workflow_id))

    # log action to stdout
    logging.info(f'Adding item type {node_type} to graph for'
                 f'workflow {workflow_id} by user {userid}.')
    #---------------------------------------------------------------------------

    res = None

    match node_type:
        case "Cluster":
            projection = db.graph.find_one(ObjectId(str(oid)))
            cluster = projection["doclists"][int(kwargs["options"]["index"])]
            ranked_docs = cluster["ranked_documents"]
            documents = [d[0] for d in ranked_docs]

            res = add_group(database=database, workflow_id=workflow_id, userid=userid,
                            color=utils.random_color(), label=cluster["label"], documents=documents)
            node_type = "Group"
            
        case "Document" | "Group" | "Search" | "Note":
            coll = utils.get_collection(db, node_type)

            if ObjectId.is_valid(oid):
                found = coll.find_one({"_id" : ObjectId(str(oid))})
                res = found["_id"]
                
            else:
                match node_type:
                    case "Group":
                        res = add_group(database=database, workflow_id=workflow_id, userid=userid,
                                        color=utils.random_color(), label="New Group")
                    case "Search":
                        res = add_search(database=database, workflow_id=workflow_id, userid=userid,
                                         query="")
                    case "Note":
                        res = add_note(database=database, workflow_id=workflow_id, userid=userid,
                                       label="New Note", content=schemas.create_note_content())
                    

    node = graph.make_node(db, workflow_id, res, node_type)

    match node_type:
        case "Teleoscope" | "Projection" | "Difference" | "Intersection" | "Exclusion" | "Union":
            res = node["_id"]

    utils.message(replyTo, {
            "oid": str(res),
            "uid": uid,
            "nodeid": str(node["_id"]),
            "action": "OID_UID_SYNC",
            "description": "Associate OID with UID."
    })

    workflow = db.sessions.find_one({"_id": workflow_id})
    history_item = utils.update_history(
        item=workflow["history"][0],
        action=f"Add item {node_type} and with oid {oid} and uid {uid}.",
        user=userid,
    )

    utils.push_history(db, "sessions", workflow_id, history_item)
    return res



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

    # import tensorflow_hub as hub 
    # embed = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")
    # vector = embed([text]).numpy()[0].tolist()
    # return vector
    


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
def mark(*args, database: str, userid: str, workflow_id: str, workspace_id: str, 
         document_id: str, read: str, **kwargs):

    transaction_session, db = utils.create_transaction_session(db=database)
    
    userid      = ObjectId(str(userid))
    document_id = ObjectId(str(document_id))
    workflow_id  = ObjectId(str(workflow_id))
    
    session     = db.sessions.find_one({"_id": workflow_id})
    history_item = session["history"][0]
    history_item["userid"] = userid
    history_item["action"] = f"Mark document read set to {read}."


    db.documents.update_one({"_id": document_id}, {"$set": {"state.read": read}})        
    utils.push_history(db, "teleoscopes", workflow_id, history_item)



@app.task
def file_upload(*args, 
                database: str, 
                userid: str,
                workflow: str,
                path: str, 
                mimetype: str, 
                headerLine: int, 
                uniqueId: str, 
                title: str, 
                text: str, 
                groups: list, **kwargs):
    
    df = None

    if mimetype == "text/csv":
        df = pd.read_csv(path, skiprows=headerLine - 1)
    else:
        df = pd.read_excel(path, skiprows=headerLine - 1)

    db = utils.connect(db=database)
    # Process each row
    for batch in itertools.batched(df.iterrows(), 1000):
        documents = []
        for _, row in batch:
            doc = schemas.create_document_object(row[title], [], row[text], metadata=json.loads(row.to_json()))
            documents.append(doc)
        db.documents.insert_many(documents)
    
    inserted_documents = db.documents.find({})
    
    # Initialize an empty set to store the combined unique values
    unique_values = set()

    for column in groups:
        # Update the set with unique values from the current column
        unique_values.update(df[column].unique())
    
    group_map = dict()

    for group in unique_values:
        color = utils.random_color()
        res = add_group(database=database, userid=userid, workflow_id=workflow,
                        color=color, label=str(group), description="Imported group")
        
        group_map[group] = res
    
    for inserted_doc in inserted_documents:
        for group in unique_values:
            keys = [inserted_doc["metadata"][g] for g in groups]
            if group in keys:
                add_document_to_group(database=database, userid=userid, 
                    group_id=group_map[group], document_id=inserted_doc["_id"])

    import pymongo
    db.documents.create_index([('text', 'text')], background=True)


    milvus_import.apply_async(kwargs={
        'database': database,
        'userid': userid,
    }, queue='embeddings')




@app.task
def ping(*args, database: str, userid: str, message: str, replyTo: str, **kwargs):
    
    userid = ObjectId(str(userid))
                      
    msg = f"ping queue for user {userid} and database {database} with {kwargs}"
    logging.info(f"Received a ping: {message}")

    utils.message(replyTo, msg)



@app.task
def vectorize_and_upload_text(text, database, id): #(text) -> Vector
    '''
    vectorize__and_upload_text

    input: string
    output: numpy
    purpose: This function is used to return a vectorized version of the text
            (Assumes the text is error free)
    '''
    # import tensorflow_hub as hub
    # embed = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")

    # vector = embed([text]).numpy()[0].tolist()
    db = utils.connect(db=database)
    db.documents.update_one(
        {"_id": ObjectId(str(id))},
        { "$set": {
            # "textVector" : vector
        }}
    )
    print(f"Vectorized and uploaded {id}.")


if __name__ == '__main__':
    worker = tasks.app.Worker(
        include=['backend.tasks'], 
        hostname=f"tasks.{os.getlogin()}@%h{uuid.uuid4()}",
        loglevel="INFO"
    )
    worker.start()
