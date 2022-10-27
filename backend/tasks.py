import logging, pickle, utils, json, auth, numpy as np
from warnings import simplefilter
from celery import Celery, Task, chain
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
    userlist = {username:"owner"}

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
                "clusters": [],
                "label": kwargs['label'],
                "color": kwargs['color'],
                "teleoscopes": []
            }
        ],
    }
    with transaction_session.start_transaction():
        result = db.sessions.insert_one(obj, session=transaction_session)
        db.users.update_one(
            {"username": username},
            {
                "$push": {
                    "sessions": result.inserted_id
                }
            }, session=transaction_session)
        utils.commit_with_retry(transaction_session)
    return 200 # success

'''
add_user_to_session
input:
    username (string, name of user to add to session) NOTE maybe do with objectID?
    session_id (int, represents ObjectId in int)

purpose: updates the userlist in a session to include input user
'''
@app.task
def add_user_to_session(*args, **kwargs):

    transaction_session, db = utils.create_transaction_session()

    logging.info(f'adding user to {kwargs["session_id"]}.')

    # session_id needs to be typecast to ObjectId
    session_id = ObjectId(str(kwargs["session_id"]))
    session = db.sessions.find_one({"_id": session_id})

    username = kwargs["username"]
    user = db.users.find_one({"username": username})

    userlist = session["userlist"]
    userlist[username] = "collaborator"

    # update session with new userlist that includes collaborator
    with transaction_session.start_transaction():
        db.sessions.update_one({"_id": session_id},
            {
                '$set': {
                    "userlist" : userlist,
                }
            }, session=transaction_session)

        db.users.update_one(
            {"username": username},
            {
                "$push": {
                    "sessions": session_id
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
    # update history_item to have the correct color
    history_item["color"] = session["history"][0]["color"]

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
                        "ranked_post_ids": None
                    }
                ]
            }, session=transaction_session)
        logging.info(f"New teleoscope id: {teleoscope_result.inserted_id}.")
        ret = teleoscope_result
        ui_session = db.sessions.find_one({'_id': ObjectId(str(session_id))})
        history_item = ui_session["history"][0]
        history_item["timestamp"] = datetime.datetime.utcnow()
        history_item["teleoscopes"].append(ObjectId(teleoscope_result.inserted_id))

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
    return ret


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

    teleoscope_result = initialize_teleoscope(session_id=_id, label=label)    

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
                "action" : "initialize group"
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
        sessions_res = db.sessions.update_one({'_id': _id},
            {
                '$push': {
                            "history": {
                                '$each': [{
                                    "timestamp": datetime.datetime.utcnow(),
                                    "groups": groups,
                                    "clusters": clusters,
                                    "bookmarks": session["history"][0]["bookmarks"],
                                    "windows": session["history"][0]["windows"],
                                    "label": session["history"][0]["label"],
                                    "color": session["history"][0]["color"],
                                    "teleoscopes": session["history"][0]["teleoscopes"]
                                }],
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
                        negative_docs=[]),
                    save_teleoscope_state.s()
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

    history_item = group["history"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()
    if post_id in history_item["included_posts"]:
        logging.info(f'Post {post_id} already in group {group["history"][0]["label"]}.')
        return
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

        session_oid: string OID for session to add clusters to
    """
    import clustering
    logging.info(f'Starting clustering for groups {kwargs["group_id_strings"]} in session {kwargs["session_oid"]}.')
    clustering.cluster_by_groups(kwargs["group_id_strings"], kwargs["session_oid"])


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
        fch = Path(path + 'embeddings.npz').expanduser()
        if fch.exists():
            loadPosts = np.load(path + 'embeddings.npz', allow_pickle=False)
            with open(path + 'ids.pkl', 'rb') as handle:
                self.allPostIDs = pickle.load(handle)
            self.allPostVectors = loadPosts['posts']
            self.postsCached = True
        else:
            db = utils.connect()
            allPosts = utils.getAllPosts(db, projection={'id':1, 'selftextVector':1, '_id':0}, batching=True, batchSize=10000)
            ids = [x['id'] for x in allPosts]
            vecs = np.array([x['selftextVector'] for x in allPosts])

            np.savez(path + 'embeddings.npz', posts=vecs)
            with open(path + 'ids.pkl', 'wb') as handle:
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
        post['selftextVector'] = embed([post['selftext']]).numpy()[0].tolist()
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
