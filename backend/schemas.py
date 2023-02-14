import datetime

def create_session_object(userid, label, color):
    return {
        "creation_time": datetime.datetime.utcnow(),
        "userlist": {
            "owner": userid,
            "contributors": []            
        },
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
# defensive programming!, schema migration, change management, feature flags (DEV=true) like configs cmd line opts e.g., login disabled in .yaml

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
def create_document_object(title, id, textVector, text, parent):
    return {
        "creation_time": datetime.datetime.utcnow(),
        'title': title, 
        'id': id, 
        'textVector': textVector, 
        'text': text,
        'parent': parent,
        'metadata' : {
            'id' : id
        }
    }