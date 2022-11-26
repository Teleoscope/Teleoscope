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
        logging.info(f"Post {data['id']} is missing required fields. Post not imported.")
        return {'error': 'Post is missing required fields.'}

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
        logging.info(f"Post {data['id']} is missing required fields. Post not imported.")
        return {'error': 'Post is missing required fields.'}

    document = {
            'id': data['id'],
            'title': data['title'],
            'text': data['text']
    }

    return document


@app.task
def vectorize_document(document):
    '''
    vectorize_document

    input: Dict
    output: Dict
    purpose: This function is used to update the dictionary with a vectorized version of the title and text
            (Ignores dictionaries containing error keys)
    '''
    import tensorflow_hub as hub
    if 'error' not in document:
        embed = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")
        document['vector'] = embed([document['title']]).numpy()[0].tolist()
        document['textVector'] = embed([document['text']]).numpy()[0].tolist()
        return document
    else:
        return document



@app.task
def add_single_document_to_database(document):
    '''
    add_single_document_to_database

    input: Dict
    output: void
    purpose: This function adds a single document to the database
            (Ignores dictionaries containing error keys)
    '''
    if 'error' not in document:
         # Create session
        session, db = utils.create_transaction_session()
        target = db.documents 
        with session.start_transaction():
            # Insert document into database
            target.insert_one(document, session=session)
            # Commit the session with retry
            utils.commit_with_retry(session)


@app.task
def add_multiple_documents_to_database(documents):
    '''
    add_single_document_to_database

    input: List[Dict]
    output: void
    purpose: This function adds multiple documents to the database
            (Ignores dictionaries containing error keys)
    '''
    documents = (list (filter (lambda x: 'error' not in x, documents)))
    # Create session
    session, db = utils.create_transaction_session()
    if len(documents) > 0:
        target = db.documents
        with session.start_transaction():
            # Insert documents into database
            target.insert_many(documents, session=session)
            # Commit the session with retry
            utils.commit_with_retry(session)
