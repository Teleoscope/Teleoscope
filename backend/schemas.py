import datetime
from bson.objectid import ObjectId


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

def create_session_object(
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
                "notes": notes
            }
        ],
    }

def create_user_object(first_name, last_name, password, username):
    return {
        "creation_time": datetime.datetime.utcnow(),
        "firstName": first_name,
        "lastName": last_name,
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

def create_node(type):
    return {
        "creation_time": datetime.datetime.utcnow(),
        "type": type,
        "status": "loading",
        "matrix": None,
        "columns": [],
        "doclists": [],
        "edges": {
            "source": [],
            "control": [],
        }
    }