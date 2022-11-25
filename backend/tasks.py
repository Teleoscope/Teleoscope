import logging, pickle, utils, json, auth, numpy as np
from warnings import simplefilter
from celery import Celery, Task, chain
from bson.objectid import ObjectId
from kombu import Consumer, Exchange, Queue
import datetime

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

    with transaction_session.start_transaction():
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

@app.task
def add_user_to_session(*args, **kwargs):
    """
    Add new user to session's userlist. Provide read/write access.
    kwargs:
        userid: (string, BSON ObjectId format)
        session_id: (int, represents ObjectId in int)
    """
    transaction_session, db = utils.create_transaction_session()

    logging.info(f'adding user to {kwargs["session_id"]}.')

    # session_id needs to be typecast to ObjectId
    session_id = ObjectId(str(kwargs["session_id"]))
    session = db.sessions.find_one({"_id": session_id})

    userid = kwargs["userid"]
    user = db.users.find_one({"_id": userid})
    username = user["username"]

    curr_username = kwargs["current"]
    curr_user = db.users.find_one({"username": curr_username})
    curr_user_id = curr_user['_id']

    userlist = session["userlist"]

    # check if user has already been added
    if username in userlist:
        logging.info(f'User {username} is already on userlist')
        raise Exception(f'User {username} is already on userlist')

    userlist[username] = "collaborator"

    history_item = session["history"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()
    history_item["action"] = f"Add {username} to userlist"
    history_item["user"] = curr_user_id

    # update session with new userlist that includes collaborator
    with transaction_session.start_transaction():
        db.sessions.update_one({"_id": session_id},
            {
                '$set': {
                    "userlist" : userlist,
                },
                "$push": {
                    "history": {
                        "$each": [history_item],
                        "$position": 0
                    }
                }
            }, session=transaction_session)

        db.users.update_one(
            {"_id": userid},
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
    Performs a text query on aita.clean.posts.v3 text index.
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
                        "ranked_post_ids": None,
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

    # TODO record user
#         userid = kwargs["userid"]
#         user = db.users.find_one({"_id": userid})
#         history_item["user"] = user
 
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
def add_group(*args, human=True, included_posts=[], **kwargs):
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
                "included_posts": included_posts,
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

        if len(included_posts) > 0:
            logging.info(f'Reorienting teleoscope {teleoscope_result.inserted_id} for group {label}.')
            res = chain(
                    robj.s(teleoscope_id=teleoscope_result.inserted_id,
                        positive_docs=included_posts,
                        negative_docs=[]).set(queue=auth.rabbitmq["task_queue"]),
                    save_teleoscope_state.s().set(queue=auth.rabbitmq["task_queue"])
            )
            res.apply_async()
        
        return groups_res.inserted_id


@app.task
def add_post_to_group(*args, **kwargs):
    """
    Adds a post_id to a group.

    kwargs:
        group_id: (int, represents ObjectId for a group)
        post_id: (string, arbitrary)
    """
    session, db = utils.create_transaction_session()

    # handle kwargs
    group_id = ObjectId(kwargs["group_id"])
    post_id = kwargs["post_id"]

    group = db.groups.find_one({'_id': group_id})
    # Check if group exists
    if not group:
        logging.info(f"Warning: group with id {group_id} not found.")
        raise Exception(f"group with id {group_id} not found")

    # check if post has already been added
    if post_id in group:
        logging.info(f'Post {post_id} is already in group')
        raise Exception(f'Post {post_id} is already in group')

    history_item = group["history"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()
    if post_id in history_item["included_posts"]:
        logging.info(f'Post {post_id} already in group {group["history"][0]["label"]}.')
        return
    history_item["included_posts"].append(post_id)
    history_item["action"] = "Add post to group"

    # TODO record user
#         userid = kwargs["userid"]
#         user = db.users.find_one({"_id": userid})
#         history_item["user"] = user

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
    logging.info(f'Reorienting teleoscope {group["teleoscope"]} for group {group["history"][0]["label"]}.')
    res = chain(
                robj.s(teleoscope_id=str(group["teleoscope"]),
                       positive_docs=[post_id],
                       negative_docs=[]),
                save_teleoscope_state.s()
    )
    res.apply_async()
    return None

@app.task
def remove_post_from_group(*args, **kwargs):
    """
    Remove the post_id from the included_posts of the specified group_id.

    kwargs:
        group_id (int, represents ObjectId for a group)
        post_id (string, arbitrary)
    """
    session, db = utils.create_transaction_session()

    # handle kwargs
    group_id = ObjectId(kwargs["group_id"])
    post_id = kwargs["post_id"]

    group = db.groups.find_one({'_id': group_id})
    if not group:
        logging.info(f"Warning: group with id {group_id} not found.")
        raise Exception(f"group with id {group_id} not found")

    history_item = group["history"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()
    history_item["included_posts"].remove(post_id)
    history_item["action"] = "Remove post from group"

        # TODO record user
    #         userid = kwargs["userid"]
    #         user = db.users.find_one({"_id": userid})
    #         history_item["user"] = user

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

        # TODO record user
    #         userid = kwargs["userid"]
    #         user = db.users.find_one({"_id": userid})
    #         history_item["user"] = user

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
        id: post_id (string) 
    """    
    # Try finding post
    session, db = utils.create_transaction_session()
    post_id = kwargs["post_id"]

    if not db.posts.find_one({'id': post_id}):
        logging.info(f"Warning: post with id {post_id} not found.")
        raise Exception(f"post with id {post_id} not found")

    obj = {
        "post_id": post_id,
        "creation_time": datetime.datetime.utcnow(),
        "history": [{
            "content": {},
            "timestamp": datetime.datetime.utcnow()
        }]
    }
    with session.start_transaction():
        res = db.notes.insert_one(obj, session=session)
        logging.info(f"Added note for post {post_id} with result {res}.")
        utils.commit_with_retry(session)


@app.task
def update_note(*args, **kwargs):
    """
    Updates a note.

    kwargs:
        post_id: string
        content: string
    """
    session, db = utils.commit_with_retry()
    post_id = kwargs["post_id"]
    content = kwargs["content"]

    if not db.notes.find_one({'post_id': post_id}):
        logging.info(f"Warning: note with id {post_id} not found.")
        raise Exception(f"note with id {post_id} not found")

    with session.start_transaction():
        res = db.notes.update_one({"post_id": post_id}, {"$push":
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
        logging.info(f"Updated note for post {post_id} with result {res}.")


@app.task
def cluster_by_groups(*args, **kwargs):
    """
    Cluster documents using user-provided group ids.

    kwargs:

        teleoscope_oid: GridFS OID address for ranked posts. 
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
        self.postsCached = False
        self.allPostIDs = None
        self.allPostVectors = None
        self.db = None
        self.model = None

    def cachePostsData(self, path='~/embeddings/'):
        # cache embeddings
        from pathlib import Path
        dir = Path(path).expanduser()
        dir.mkdir(parents=True, exist_ok=True)
        npzpath = Path(path + 'embeddings.npz').expanduser()
        pklpath = Path(path + 'ids.pkl').expanduser()
        
        if npzpath.exists() and pklpath.exists():
            logging.info("Posts have been cached, retrieving now.")
            loadPosts = np.load(npzpath.as_posix(), allow_pickle=False)
            with open(pklpath.as_posix(), 'rb') as handle:
                self.allPostIDs = pickle.load(handle)
            self.allPostVectors = loadPosts['posts']
            self.postsCached = True
        else:
            logging.info("Posts are not cached, building cache now.")
            db = utils.connect()
            allPosts = utils.getAllPosts(db, projection={'id':1, 'textVector':1, '_id':0}, batching=True, batchSize=10000)
            ids = [x['id'] for x in allPosts]
            logging.info(f'There are {len(ids)} ids in posts.')
            vecs = np.array([x['textVector'] for x in allPosts])

            np.savez(npzpath.as_posix(), posts=vecs)
            with open(pklpath.as_posix(), 'wb') as handle:
                pickle.dump(ids, handle, protocol=pickle.HIGHEST_PROTOCOL)
            self.allPostIDs = ids
            self.allPostVectors = vecs
            self.postsCached = True
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
        # using utils.getPostVector function
        # TODO: OPTIMIZE

        posVecs = []  # vectors we want to move towards
        for pos_id in positive_docs:
            v = utils.getPostVector(self.db, pos_id)
            posVecs.append(v)

        negVecs = []  # vectors we want to move away from
        for neg_id in negative_docs:
            v = utils.getPostVector(self.db, neg_id)
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
            # Check if post ids and vectors are cached
            if self.postsCached == False:
                self.cachePostsData()

            # Check if db connection is cached
            if self.db is None:
                self.db = utils.connect()

            # do nothing since no feedback given on docs
            logging.info(f'No positive or negative docs specified for teleoscope {teleoscope_id}.')
            return 200 # trival pass

        # Check if post ids and vectors are cached
        if self.postsCached == False:
            self.cachePostsData()

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
            first_doc = self.db.clean.posts.v3.find_one({"id": docs[0]})
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
        scores = utils.calculateSimilarity(self.allPostVectors, qprime)
        newRanks = utils.rankPostsBySimilarity(self.allPostIDs, scores)
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
                'ranked_post_ids': ObjectId(str(gridfs_id)),
                'rank_slice': rank_slice
            }
        }

        return history_obj
robj = app.register_task(reorient())

#################################################################
# Post importing tasks
#################################################################

@app.task
def read_post(path_to_post):
    '''
    read_post

    input: String (Path to json file)
    output: Dict
    purpose: This function is used to read a single post from a json file to a database
    '''
    try:
        with open(path_to_post, 'r') as f:
            post = json.load(f)
    except Exception as e:
        return {'error': str(e)}

    return post


@app.task
def validate_post(data):
    '''
    validate_post

    input: Dict (post)
    output: Dict
    purpose: This function is used to validate a single post.
            If the file is missing required fields, a dictionary with an error key is returned
    '''
    if data.get('selftext', "") == "" or data.get('title', "") == "" or data['selftext'] == '[deleted]' or data['selftext'] == '[removed]':
        logging.info(f"Post {data['id']} is missing required fields. Post not imported.")
        return {'error': 'Post is missing required fields.'}

    post = {
            'id': data['id'],
            'title': data['title'],
            'selftext': data['selftext']}

    return post


@app.task
def read_and_validate_post(path_to_post):
    '''
    read_and_validate_post

    input: String (Path to json file)
    output: Dict
    purpose: This function is used to read and validate a single post from a json file to a database
            If the file is missing required fields, a dictionary with an error key is returned
    '''
    with open(path_to_post) as f:
            data = json.load(f)
    if data['selftext'] == "" or data['title'] == "" or data['selftext'] == '[deleted]' or data['selftext'] == '[removed]':
        logging.info(f"Post {data['id']} is missing required fields. Post not imported.")
        return {'error': 'Post is missing required fields.'}

    post = {
            'id': data['id'],
            'title': data['title'],
            'selftext': data['selftext']
    }

    return post


@app.task
def vectorize_post(post):
    '''
    vectorize_post

    input: Dict
    output: Dict
    purpose: This function is used to update the dictionary with a vectorized version of the title and selftext
            (Ignores dictionaries containing error keys)
    '''
    import tensorflow_hub as hub
    if 'error' not in post:
        embed = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")
        post['vector'] = embed([post['title']]).numpy()[0].tolist()
        post['textVector'] = embed([post['selftext']]).numpy()[0].tolist()
        return post
    else:
        return post



@app.task
def add_single_post_to_database(post):
    '''
    add_single_post_to_database

    input: Dict
    output: void
    purpose: This function adds a single post to the database
            (Ignores dictionaries containing error keys)
    '''
    if 'error' not in post:
         # Create session
        session, db = utils.create_transaction_session()
        target = db.clean.posts.v3 
        with session.start_transaction():
            # Insert post into database
            target.insert_one(post, session=session)
            # Commit the session with retry
            utils.commit_with_retry(session)


@app.task
def add_multiple_posts_to_database(posts):
    '''
    add_single_post_to_database

    input: List[Dict]
    output: void
    purpose: This function adds multiple posts to the database
            (Ignores dictionaries containing error keys)
    '''
    posts = (list (filter (lambda x: 'error' not in x, posts)))
    # Create session
    session, db = utils.create_transaction_session()
    if len(posts) > 0:
        target = db.clean.posts.v3
        with session.start_transaction():
            # Insert posts into database
            target.insert_many(posts, session=session)
            # Commit the session with retry
            utils.commit_with_retry(session)
