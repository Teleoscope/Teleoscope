import logging, pickle, utils, json, auth, numpy as np, tensorflow_hub as hub
from warnings import simplefilter
from gridfs import GridFS
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


'''
read_post

input: String (Path to json file)
output: Dict
purpose: This function is used to read a single post from a json file to a database
'''
@app.task
def read_post(path_to_post):
    try:
        with open(path_to_post, 'r') as f:
            post = json.load(f)
    except Exception as e:
        return {'error': str(e)}

    return post

'''
validate_post

input: Dict (post)
output: Dict
purpose: This function is used to validate a single post.
        If the file is missing required fields, a dictionary with an error key is returned
'''
@app.task
def validate_post(data):
    if data.get('selftext', "") == "" or data.get('title', "") == "" or data['selftext'] == '[deleted]' or data['selftext'] == '[removed]':
        logging.info(f"Post {data['id']} is missing required fields. Post not imported.")
        return {'error': 'Post is missing required fields.'}

    post = {
            'id': data['id'],
            'title': data['title'],
            'selftext': data['selftext']}

    return post


'''
read_and_validate_post

input: String (Path to json file)
output: Dict
purpose: This function is used to read and validate a single post from a json file to a database
        If the file is missing required fields, a dictionary with an error key is returned
'''
@app.task
def read_and_validate_post(path_to_post):
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

'''
vectorize_post

input: Dict
output: Dict
purpose: This function is used to update the dictionary with a vectorized version of the title and selftext
        (Ignores dictionaries containing error keys)
'''
@app.task
def vectorize_post(post):
	if 'error' not in post:
		embed = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")
		post['vector'] = embed([post['title']]).numpy()[0].tolist()
		post['selftextVector'] = embed([post['selftext']]).numpy()[0].tolist()
		return post
	else:
		return post


'''
add_single_post_to_database

input: Dict
output: void
purpose: This function adds a single post to the database
        (Ignores dictionaries containing error keys)
'''
@app.task
def add_single_post_to_database(post):
    if 'error' not in post:
         # Create session
        session, db = utils.create_transaction_session()
        target = db.clean.posts.v3 
        with session.start_transaction():
            # Insert post into database
            target.insert_one(post, session=session)
            # Commit the session with retry
            utils.commit_with_retry(session)

'''
add_single_post_to_database

input: List[Dict]
output: void
purpose: This function adds multiple posts to the database
        (Ignores dictionaries containing error keys)
'''
@app.task
def add_multiple_posts_to_database(posts):
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

'''
initialize_session
input: 
    username (string, arbitrary)
purpose: adds a session to the sessions collection
'''
@app.task
def initialize_session(*args, **kwargs):
    transaction_session, db = utils.create_transaction_session()
    username = kwargs["username"]
    logging.info(f'Initializing sesssion for user {username}.')
    # Check if user exists and throw error if not
    user = db.users.find_one({"username": username})
    if user is None:
        logging.info(f'User {username} does not exist.')
        raise Exception(f"User {username} does not exist.")
    obj = {
        "creation_time": datetime.datetime.utcnow(),
        "username": username,
        "history": [
            {
                "timestamp": datetime.datetime.utcnow(),
                "bookmarks": [],
                "windows": [],
                "groups": []
            }
        ],
        "teleoscopes": []
    }
    with transaction_session.start_transaction():
        result = db.sessions.insert_one(obj, session=transaction_session)
        db.users.update_one({"username": username},
            {
                "$push": {
                    "sessions": result.inserted_id
                }
            }, session=transaction_session)
        utils.commit_with_retry(transaction_session)
    return 200 # success

'''
save_UI_state
input: 
    session_id (int, represents ObjectId in int)
    history_item (Dict)
purpose: updates a session document in the sessions collection
'''
@app.task
def save_UI_state(*args, **kwargs):
    # Error checking
    if 'session_id' not in kwargs:
        logging.info(f"session_id not in kwargs.")
        raise Exception("session_id not in kwargs")
    if 'history_item' not in kwargs:
        logging.info(f"history_item not in kwargs.")
        raise Exception("history_item not in kwargs")
    #session, db = utils.create_transaction_session()
    transaction_session, db = utils.create_transaction_session()
    logging.info(f'Saving state for {kwargs["session_id"]}.')
    # session_id needs to be typecast to ObjectId
    session_id = ObjectId(str(kwargs["session_id"]))
    session = db.sessions.find_one({"_id": session_id})
    # check if session id is valid, if not, raise exception
    if not session:
        logging.info(f"Session {session_id} not found.")
        raise Exception("Session not found")
    
    history_item = kwargs["history_item"]
    # timestamp API call
    history_item["timestamp"] = datetime.datetime.utcnow()
    # extract latest collection of groups in session history
    groups = session["history"][0]["groups"]
    # update history_item to have the correct groups
    history_item["groups"] = groups
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

'''
initialize_teleoscope:
Performs a text query on aita.clean.posts.v2 text index.
If the query string already exists in the teleoscopes collection, returns existing reddit_ids.
Otherwise, adds the query to the teleoscopes collection and performs a text query the results of which are added to the
teleoscopes collection and returned.
TODO: 
1. We can use GridFS to store the results of the query if needed (if sizeof(reddit_ids) > 16MB).
   Doesnt seem to be an issue right now.
2. Checks for both teleoscope_id and query. Need confirmation from frontend on whether the teleoscope_id and/or query will already exist?
   If not, then who updates them?
'''
@app.task
def initialize_teleoscope(*args, **kwargs):
    if 'label' not in kwargs:
        logging.info(f"label not in kwargs.")
        raise Exception("label not in kwargs")
    label = kwargs["label"]
    if label == "":
        logging.info(f"label {label} is empty.")
        return []
    session, db = utils.create_transaction_session()

    # perform text search query
    labelAsTextSearch = {"$text": {"$search": label}}
    cursor = db.clean.posts.v2.find(labelAsTextSearch, projection = {'id':1})
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
        db.sessions.update_one({'_id': ObjectId(str(kwargs["session_id"]))},
            {
                '$push': {
                    "teleoscopes": ObjectId(teleoscope_id.inserted_id)
                }
            }, session=session)
        utils.commit_with_retry(session)
    logging.info(f"label {label} added to teleoscopes collection")
    return return_ids

'''
save_teleoscope_state
input:
    _id (int, represents ObjectId for a teleoscope)
    history_item (Dict)
purpose: save the current state of a teleoscope
'''
@app.task
def save_teleoscope_state(history_obj):
    # Error checking
    if '_id' not in history_obj:
        logging.info(f"_id not in kwargs.")
        raise Exception("_id not in kwargs")
    if 'history_item' not in history_obj:
        logging.info(f"history_item not in kwargs.")
        raise Exception("history_item not in kwargs")

    session, db = utils.create_transaction_session()
    logging.info(f'Saving state for teleoscope {history_obj["_id"]}.')
    _id = str(history_obj["_id"])
    obj_id = ObjectId(_id)

    # check if teleoscope id is valid, if not, raise exception
    if not db.teleoscopes.find_one({"_id": obj_id}):
        logging.info(f"Teleoscope {_id} not found.")
        raise Exception("Teleoscope not found")

    history_item = history_obj["history_item"]
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

'''
save_group_state
input: 
    group_id: String
    history_item: Dict
purpose: This function saves the state of a group to the database
Effects: Throws exception
'''
@app.task
def save_group_state(*args, **kwargs):
    # Error checking
    if 'group_id' not in kwargs:
        logging.info(f"session_id not in kwargs.")
        raise Exception("session_id not in kwargs")
    if 'history_item' not in kwargs:
        logging.info(f"history_item not in kwargs.")
        raise Exception("history_item not in kwargs")
    session, db = utils.create_transaction_session()
    group_id, history_item = ObjectId(kwargs['group_id']), kwargs['history_item']
    history_item["timestamp"] =  datetime.datetime.utcnow()
    # Find group with group_id
    group = db.groups.find_one({'_id': group_id})
    if group:
        with session.start_transaction():
            # Update group with history_item
            db.groups.update_one({'_id': group_id}, {'$push': {'history': history_item}}, session=session)
            utils.commit_with_retry(session)
    else:
        raise Exception(f"Group with id {group_id} not found")



'''
add_group
input: 
    label (string, arbitrary)
    color (string, hex color)
    session_id (int, represents ObjectId in int)
purpose: adds a group to the group collection and links newly created group to corresponding session
'''
@app.task 
def add_group(*args, **kwargs):
    # Error checking
    if "label" not in kwargs:
        logging.info(f"Warning: label not in kwargs.")
        raise Exception("label not in kwargs")
    if "color" not in kwargs:
        logging.info(f"Warning: color not in kwargs.")
        raise Exception("color not in kwargs")
    if "session_id" not in kwargs:
        logging.info(f"Warning: session_id not in kwargs.")
        raise Exception("session_id not in kwargs")
    
    # Creating document to be inserted into mongoDB
    obj = {
        "creation_time": datetime.datetime.utcnow(),
        "history": [
            {
                "timestamp": datetime.datetime.utcnow(),
                "color": kwargs["color"],
                "included_posts": [],
                "label": kwargs["label"]
            }]
    }

    # session_id must be cast from an int to mongo ObjectId
    _id = ObjectId(str(kwargs["session_id"]))
    # call needs to be transactional due to groups & sessions collections being updated
    transaction_session, db = utils.create_transaction_session()
    with transaction_session.start_transaction():
        groups_res = db.groups.insert_one(obj, session=transaction_session)
        logging.info(f"Added group {obj['history'][0]['label']} with result {groups_res}.")
        # add created groups document to the correct session
        session = db.sessions.find_one({'_id': _id}, session=transaction_session)
        if not session:
            logging.info(f"Warning: session with id {_id} not found.")
            raise Exception(f"session with id {_id} not found")
        groups = session["history"][0]["groups"]
        groups.append(groups_res.inserted_id)
        sessions_res = db.sessions.update_one({'_id': _id},
            {
                '$push': {
                            "history": {
                                '$each': [{
                                    "timestamp": datetime.datetime.utcnow(),
                                    "groups": groups,
                                    "bookmarks": session["history"][0]["bookmarks"],
                                    "windows": session["history"][0]["windows"]
                                }],
                                '$position': 0
                            }
                }
            }, session=transaction_session)
        logging.info(f"Associated group {obj['history'][0]['label']} with session {_id} and result {sessions_res}.")
        utils.commit_with_retry(transaction_session)
        return groups_res.inserted_id

'''
add_post_to_group
input:
    group_id (int, represents ObjectId for a group)
    post_id (string, arbitrary)
purpose: adds a post_id to a group
'''
@app.task
def add_post_to_group(*args, **kwargs):
    if "group_id" not in kwargs:
        logging.info(f"Warning: group_id not in kwargs.")
        raise Exception("group_id not in kwargs")
    if "post_id" not in kwargs:
        logging.info(f"Warning: post_id not in kwargs.")
        raise Exception("post_id not in kwargs")

    session, db = utils.create_transaction_session()
    group_id = ObjectId(kwargs["group_id"])
    group = db.groups.find_one({'_id': group_id})
    # Check if group exists
    if not group:
        logging.info(f"Warning: group with id {group_id} not found.")
        raise Exception(f"group with id {group_id} not found")

    history_item = group["history"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()
    history_item["included_posts"].append(kwargs["post_id"])
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

'''
remove_post_from_group
input:
    group_id (int, represents ObjectId for a group)
    post_id (string, arbitrary)
purpose: remove the post_id from the included_posts of the specified group_id
'''
@app.task
def remove_post_from_group(*args, **kwargs):
    if "group_id" not in kwargs:
        logging.info(f"Warning: group_id not in kwargs.")
        raise Exception("group_id not in kwargs")
    if "post_id" not in kwargs:
        logging.info(f"Warning: post_id not in kwargs.")
        raise Exception("post_id not in kwargs")

    session, db = utils.create_transaction_session()
    group_id = ObjectId(kwargs["group_id"])
    group = db.groups.find_one({'_id': group_id})
    if not group:
        logging.info(f"Warning: group with id {group_id} not found.")
        raise Exception(f"group with id {group_id} not found")

    history_item = group["history"][0]
    history_item["timestamp"] = datetime.datetime.utcnow()
    history_item["included_posts"].remove(kwargs["post_id"])
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
        

'''
update_group_label
input:
    group_id (int, represents ObjectId for a group)
    label (string, arbitrary)
purpose: update the label of the specified group_id
'''
@app.task
def update_group_label(*args, **kwargs):
    if "group_id" not in kwargs:
        logging.info(f"Warning: group_id not in kwargs.")
        raise Exception("group_id not in kwargs")

    session, db = utils.create_transaction_session()
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

'''
add_note
input:
    id: post_id (string) 
purpose: adds a note to the notes collection
'''
@app.task
def add_note(*args, **kwargs):
    # Error checking
    if "post_id" not in kwargs:
        logging.info(f"Warning: post_id not in kwargs.")
        raise Exception("post_id not in kwargs")
    # Try finding post
    session, db = utils.create_transaction_session()
    if not db.posts.find_one({'id': kwargs["post_id"]}):
        logging.info(f"Warning: post with id {kwargs['post_id']} not found.")
        raise Exception(f"post with id {kwargs['post_id']} not found")

    obj = {
        "post_id": kwargs["post_id"],
        "creation_time": datetime.datetime.utcnow(),
        "history": [{
            "content": {},
            "timestamp": datetime.datetime.utcnow()
        }]
    }
    with session.start_transaction():
        res = db.notes.insert_one(obj, session=session)
        logging.info(f"Added note for post {kwargs['post_id']} with result {res}.")
        utils.commit_with_retry(session)


@app.task
def update_note(*args, **kwargs):
    # Error checking
    if "post_id" not in kwargs:
        logging.info(f"Warning: note_id not in kwargs.")
        raise Exception("note_id not in kwargs")
    if "content" not in kwargs:
        logging.info(f"Warning: content not in kwargs.")
        raise Exception("content not in kwargs")

    session, db = utils.commit_with_retry()
    if not db.notes.find_one({'post_id': kwargs["post_id"]}):
        logging.info(f"Warning: note with id {kwargs['post_id']} not found.")
        raise Exception(f"note with id {kwargs['post_id']} not found")

    with session.start_transaction():
        res = db.notes.update_one({"post_id": kwargs["post_id"]}, {"$push":
                {
                    "history": {
                        "$each": [{
                        "content": kwargs["content"],
                        "timestamp": datetime.datetime.utcnow()
                        }],
                        "$position": 0
                    }
                }
            }, session=session)
        utils.commit_with_retry(session)
        logging.info(f"Updated note for post {kwargs['post_id']} with result {res}.")

'''
TODO:
1. As we move towards/away from docs, we need to keep track of which
   docs have been moved towards/away from because those docs should
   not be show in the ranked documents.
'''
class reorient(Task):

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


    '''
    Computes the resultant vector for positive and negative docs.
    Resultant vector is the final vector that the stateVector of
    the teleoscope should move towards/away from.
    '''
    def computeResultantVector(self, positive_docs, negative_docs):
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

    def gridfsUpload(self, namespace, data, encoding='utf-8'):
         # convert to json
        dumps = json.dumps(data)
        fs = GridFS(self.db, namespace)
        obj = fs.put(dumps, encoding=encoding)
        return obj

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
        gridfsObj = self.gridfsUpload("teleoscopes", newRanks)

        rank_slice = newRanks[0:500]
        logging.info(f'new rank slice has length {len(rank_slice)}.')

        # # update stateVector
        # self.db.teleoscopes.update_one({"_id": _id}, {'$set': { "stateVector" : qprime.tolist()}})
        # # update rankedPosts
        # self.db.teleoscopes.update_one({"_id": _id}, {'$set': { "ranked_post_ids" : gridfsObj}})
        # # update a slice of rank_slice
        # self.db.teleoscopes.update_one({"_id": _id}, {'$set': { "rank_slice" : rank_slice}})

        # ! Teleoscope history item -> return this and use it in a chain
        # label
        # positive docs
        # negative docs
        # stateVector
        # ranked_post_ids
        # rank_slice
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
