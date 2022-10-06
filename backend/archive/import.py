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
    import tensorflow_hub as hub
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
