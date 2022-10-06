import logging, pickle, utils, json, auth, numpy as np
from warnings import simplefilter
from celery import Celery, Task
from bson.objectid import ObjectId
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

app = Celery('tasks', backend='rpc://', broker=CELERY_BROKER_URL)
app.conf.update(
    task_serializer='pickle',
    accept_content=['pickle'],  # Ignore other content
    result_serializer='pickle',
)


@app.task
def initialize_session(*args, **kwargs):
    """
    Adds a session to the sessions collection.
    
    kwargs: 
        username: (string, arbitrary)
    """
    transaction_session, db = utils.create_transaction_session()
    
    # handle kwargs
    username = kwargs["username"]
    label = kwargs['label']
    
    logging.info(f'Initializing sesssion for user {username}.')
    # Check if user exists and throw error if not
    user = db.users.find_one({"username": username})

    # grab all users for now (no 'team')
    users = db.users.find({})
    usernames = [u["username"] for u in users]
    userlist = {u:"read" for u in usernames}
    userlist[user["username"]] = "write"

    if user is None:
        logging.info(f'User {username} does not exist.')
        raise Exception(f"User {username} does not exist.")
    obj = {
        "creation_time": datetime.datetime.utcnow(),
        "userlist": userlist,
        "history": [
            {
                "timestamp": datetime.datetime.utcnow(),
                "bookmarks": [],
                "windows": [],
                "groups": [],
                "mlgroups": [],
                "label": label,
            }
        ],
        "teleoscopes": []
    }
    with transaction_session.start_transaction():
        result = db.sessions.insert_one(obj, session=transaction_session)
        db.users.update_many(
            {
                "username": {
                    "$in": usernames
                }
            },
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
    
    # handle kwargs
    history_item = kwargs["history_item"]
    session_id = ObjectId(str(kwargs["session_id"]))

    logging.info(f'Saving state for {session_id}.')

    # check if session id is valid, if not, raise exception
    session = db.sessions.find_one({"_id": session_id})
    if not session:
        logging.info(f"Session {session_id} not found.")
        raise Exception("Session not found")
    
    # timestamp API call
    history_item["timestamp"] = datetime.datetime.utcnow()
    
    # extract latest collection of groups in session history
    groups = session["history"][0]["groups"]
    
    # update history_item to have the correct groups
    history_item["groups"] = groups
    
    # update history_item to have the correct label
    history_item["label"] = session["history"][0]["label"]

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
def initialize_teleoscope(*args, **kwargs):
    """
    initialize_teleoscope:
    Performs a text query on aita.clean.posts.v3 text index.
    If the query string already exists in the teleoscopes collection, returns existing reddit_ids.
    Otherwise, adds the query to the teleoscopes collection and performs a text query the results of which are added to the
    teleoscopes collection and returned.
    
    kwargs:
        label: string
        session_id: string
    """
    session, db = utils.create_transaction_session()

    # handle kwargs
    label = kwargs["label"]
    session_id = kwargs["session_id"]

    # perform text search query
    labelAsTextSearch = {"$text": {"$search": label}}
    cursor = db.clean.posts.v3.find(labelAsTextSearch, projection = {'id':1})
    return_ids = [x['id'] for x in cursor]
    rank_slice = [(x, 1.0) for x in return_ids[0:min(500, len(return_ids))]]

    logging.info(f"About to insert a new teleoscope for {label}.")
    # create a new query document
    with session.start_transaction():
        teleoscope_id = db.teleoscopes.insert_one({
                "creation_time": datetime.datetime.utcnow(),
                "history": [
                    {
                        "timestamp": datetime.datetime.utcnow(),
                        "label": label,
                        "rank_slice": rank_slice,
                        "reddit_ids": return_ids,
                        "positive_docs": [],
                        "negative_docs": [],
                        "stateVector": [],
                        "ranked_post_ids": None
                    }
                ]
            }, session=session)
        logging.info(f"New teleoscope id: {teleoscope_id.inserted_id}.")

        # associate the newly created teleoscope with correct session
        db.sessions.update_one({'_id': ObjectId(str(session_id))},
            {
                '$push': {
                    "teleoscopes": ObjectId(teleoscope_id.inserted_id)
                }
            }, session=session)
        utils.commit_with_retry(session)
    logging.info(f"label {label} added to teleoscopes collection")
    return return_ids


@app.task
def save_teleoscope_state(*args, **kwargs):
    """
    Save the current state of a teleoscope.
    
    input:
        _id (int, represents ObjectId for a teleoscope)
        history_item (Dict)
    """
    session, db = utils.create_transaction_session()

    # handle kwargs
    _id = str(kwargs["_id"])
    history_item = kwargs["history_item"]

    logging.info(f'Saving state for teleoscope {_id}.')
    obj_id = ObjectId(_id)

    # check if teleoscope id is valid, if not, raise exception
    if not db.teleoscopes.find_one({"_id": obj_id}):
        logging.info(f"Teleoscope {_id} not found.")
        raise Exception("Teleoscope not found")

    history_item["timestamp"] = datetime.datetime.utcnow()
    with session.start_transaction():
        result = db.teleoscopes.update({"_id": obj_id},
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
def save_group_state(*args, **kwargs):
    """
    This function saves the state of a group to the database.

    kwargs: 
       group_id: String
       history_item: Dict
    Effects: Throws exception
    """
    session, db = utils.create_transaction_session()

    # handle kwargs
    group_id = ObjectId(kwargs['group_id'])
    history_item = kwargs['history_item']

    # create a copy of the history item and update the timestamp
    history_item["timestamp"] = datetime.datetime.utcnow()

    # Find group with group_id
    group = db.groups.find_one({'_id': group_id})
    if group:
        with session.start_transaction():
            # Update group with history_item
            db.groups.update_one({'_id': group_id}, {'$push': {'history': history_item}}, session=session)
            utils.commit_with_retry(session)
    else:
        raise Exception(f"Group with id {group_id} not found.")


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

    # Creating document to be inserted into mongoDB
    obj = {
        "creation_time": datetime.datetime.utcnow(),
        "history": [
            {
                "timestamp": datetime.datetime.utcnow(),
                "color": color,
                "included_posts": included_posts,
                "label": label
            }]
    }
    
    # call needs to be transactional due to groups & sessions collections being updated

    collection = db.groups
    if not human:
        collection = db.mlgroups

    with transaction_session.start_transaction():
        groups_res = collection.insert_one(obj, session=transaction_session)
        logging.info(f"Added group {obj['history'][0]['label']} with result {groups_res}.")
        # add created groups document to the correct session
        session = db.sessions.find_one({'_id': _id}, session=transaction_session)
        if not session:
            logging.info(f"Warning: session with id {_id} not found.")
            raise Exception(f"session with id {_id} not found")
        mlgroups = session["history"][0]["mlgroups"]
        groups = session["history"][0]["groups"]

        if human:
            groups.append(groups_res.inserted_id)
        else:
            mlgroups.append(groups_res.inserted_id)
        sessions_res = db.sessions.update_one({'_id': _id},
            {
                '$push': {
                            "history": {
                                '$each': [{
                                    "timestamp": datetime.datetime.utcnow(),
                                    "groups": groups,
                                    "mlgroups": mlgroups,
                                    "bookmarks": session["history"][0]["bookmarks"],
                                    "windows": session["history"][0]["windows"],
                                    "label": session["history"][0]["label"]
                                }],
                                '$position': 0
                            }
                }
            }, session=transaction_session)
        logging.info(f"Associated group {obj['history'][0]['label']} with session {_id} and result {sessions_res}.")
        utils.commit_with_retry(transaction_session)
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

    history_item = group["history"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()
    history_item["included_posts"].append(post_id)
    history_item["action"] = "Add post to group"
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

        session_oid: string OID for session to add mlgroups to
    """
    import clustering
    logging.info(f'Starting clustering for groups {kwargs["group_id_strings"]} in session {kwargs["session_oid"]}.')
    clustering.cluster_by_groups(kwargs["group_id_strings"], kwargs["teleoscope_oid"], kwargs["session_oid"])


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

    def cachePostsData(self, path='/home/phb/embeddings/'):
        # cache embeddings
        loadPosts = np.load(path + 'embeddings.npz', allow_pickle=False)
        self.allPostVectors = loadPosts['posts']
        # cache posts ids
        with open(path + '/ids.pkl', 'rb') as handle:
            self.allPostIDs = pickle.load(handle)

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

    def run(self, teleoscope_id: str, positive_docs: list, negative_docs: list):
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
        if len(teleoscope['history'][-1]['stateVector']) > 0:
            stateVector = np.array(teleoscope['history'][-1]['stateVector'])
        else:
            docs = positive_docs + negative_docs
            first_doc = self.db.clean.posts.v3.find_one({"id": docs[0]})
            logging.info(f'Results of finding first_doc: {first_doc}.')
            stateVector = first_doc['selftextVector']  # grab selftextVector

        resultantVec, direction = self.computeResultantVector(positive_docs, negative_docs)
        # move qvector towards/away from feedbackVector
        qprime = utils.moveVector(
            sourceVector=stateVector,
            destinationVector=resultantVec,
            direction=direction
        )
        scores = utils.calculateSimilarity(self.allPostVectors, qprime)
        newRanks = utils.rankPostsBySimilarity(self.allPostIDs, scores)
        gridfsObj = utils.gridfsUpload(self.db, "teleoscopes", newRanks)

        rank_slice = newRanks[0:500]
        logging.info(f'new rank slice has length {len(rank_slice)}.')

        history_obj = {
            '_id': teleoscope_id,
            'history_item': {
                'label': teleoscope['history'][-1]['label'],
                'positive_docs': positive_docs,
                'negative_docs': negative_docs,
                'stateVector': qprime.tolist(),
                'ranked_post_ids': gridfsObj,
                'rank_slice': rank_slice
            }
        }

        return history_obj

robj = app.register_task(reorient())
