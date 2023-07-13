import datetime
from bson.objectid import ObjectId
from typing import NewType
from typing import Literal
from typing import List

EdgeType = Literal["source", "control", "output"]
NodeType = Literal["Group", "Document", "Search", "Teleoscope", "Projection", "Union", "Intersection", "Exclusion", "Subtraction"]
HexStr = NewType('HexStr', str)

def create_search_object(*args, userid: ObjectId, query: str):
    obj = {
        "query": query,
        "history": {
            "timestamp": datetime.datetime.utcnow(),
            "user": userid,
            "action": "Initialize search.",
        }
    }
    return obj

def create_workspace_object(*args, owner: ObjectId, label: str, database: str, workflow: ObjectId):
    obj = {
        "owner": owner,
        "collaborators": [],
        "label": label,
        "database": database,
        "workflows": [ workflow ],
        "history": [
            {
                "timestamp": datetime.datetime.utcnow(),
                "action": "Initialize workspace.",
                "user": owner
            }
        ]
    }
    return obj


def create_group_object(color, included_documents, label, action, user_id, description, session_id, cluster_id=[]):
    obj = {
        "creation_time": datetime.datetime.utcnow(),
        "sessions": [session_id],
        "cluster": cluster_id,
        "history": [
            {
                "timestamp": datetime.datetime.utcnow(),
                "color": color,
                "included_documents": included_documents,
                "label": label,
                "action": action,
                "user": user_id,
                "description": description
            }]
    }
    return obj


def create_cluster_object(
        color, 
        projection_id, 
        included_documents, 
        label, 
        user_id, 
        description, 
        action=f"initialize cluster"):
    obj = {
        "creation_time": datetime.datetime.utcnow(),
        "projection": projection_id,
        "teleoscope": "deprecated",
        "history": [
            {
                "timestamp": datetime.datetime.utcnow(),
                "label": label,
                "color": color,
                "included_documents": included_documents,
                "description": description,
                "action": action,
                "user": user_id,
            }]
    }
    return obj


def create_projection_object(session_id, label, user_id, action=f"initialize projection"):
    obj = {
        "creation_time": datetime.datetime.utcnow(),
        "session": session_id,
        "history": [
            {
                "timestamp": datetime.datetime.utcnow(),
                "label": label,
                "clusters": [],
                "source_groups": [],
                "action": action,
                "user": user_id,
            }]
    }
    return obj


def create_workflow_object(
        *args,
        userid, 
        label, 
        color, 
        logical_clock=1, 
        contributors=[], 
        action=f"initialize_session",
        windows=[],
        edges=[],
        groups=[],
        projections=[],
        teleoscopes=[],
        bookmarks=[],
        notes=[]):
    return {
        "creation_time": datetime.datetime.utcnow(),
        "userlist": {
            "owner": userid,
            "contributors": contributors
        },
        "history": [
            {
                "timestamp": datetime.datetime.utcnow(),
                "logical_clock": logical_clock,
                "bookmarks": bookmarks,
                "windows": windows,
                "edges": edges,
                "groups": groups,
                "projections": projections,
                "teleoscopes": teleoscopes,
                "label": label,
                "color": color,
                "action": action,
                "user": userid,
                "notes": notes,
                "settings": {
                    "default_document_width": 200,
                    "default_document_height": 34,
                    "defaultExpanded": True,
                    "color": "#D3D3D3",
                }
            }
        ],
    }


def create_user_object(*args, username, password):
    return {
        "creation_time": datetime.datetime.utcnow(),
        "password": password,
        "username": username,
        "sessions":[],
        "action": "initialize a user"
    }


def create_document_object(title, textVector, text, relationships={}, metadata={}):
    return {
        "creation_time": datetime.datetime.utcnow(),
        'title': title, 
        'text': text,
        'textVector': textVector,
        'relationships': {
            **relationships
        },
        'metadata' : {
            **metadata
        }
    }


def create_teleoscope_object(session_id, userid, **kwargs):
    return {
        "creation_time": datetime.datetime.utcnow(),
        "sessions": [session_id],
        "history": [
            create_teleoscope_history_item(user = userid, **kwargs)
        ]
    }


def create_teleoscope_history_item(
        label = "New Teleoscope",
        reddit_ids = [],
        positive_docs = [], 
        negative_docs = [], 
        stateVector = [], 
        ranked_document_ids = None,
        rank_slice = [],
        action = "Initialize Teleoscope",
        user = None, **kwargs):
    history_item = {
        'timestamp': datetime.datetime.utcnow(),
        'label': label,
        'reddit_ids': reddit_ids,
        'positive_docs': positive_docs,
        'negative_docs': negative_docs,
        'stateVector': stateVector,
        'ranked_document_ids': ranked_document_ids,
        'rank_slice': rank_slice,
        'action': action,
        'user': user
    }
    return history_item


def create_note_object(userid, label, content, vector):
    return {
        "creation_time": datetime.datetime.utcnow(),
        "textVector": vector,
        "history": [create_note_history_item(userid, label, "Add note.", content=content)]
    }


def create_note_history_item(userid, label, action, content={}):
    return {
            "user" : userid,
            "label" : label,
            "action" : action,
            "content": content,
            "timestamp": datetime.datetime.utcnow()
    }


def create_node(node_type, oid):
    return {
        "creation_time": datetime.datetime.utcnow(),
        "type": node_type,
        "status": "loading",
        "matrix": None,
        "reference": oid,
        "columns": [],
        "doclists": {},
        "parameters": {},
        "edges": {
            "source": [],
            "control": [],
            "output": []
        }
    }


def create_edge(id: ObjectId, nodeid: ObjectId, node_type: NodeType):
    return {
        "id": id,
        "nodeid": nodeid,
        "type": node_type
    }