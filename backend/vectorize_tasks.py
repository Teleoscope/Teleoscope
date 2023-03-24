import logging, pickle, json, numpy as np
from warnings import simplefilter
from celery import Celery, Task, chain
from kombu import Consumer, Exchange, Queue
import datetime
import utils
from bson import ObjectId

# ignore all future warnings
simplefilter(action='ignore', category=FutureWarning)

from dotenv import load_dotenv
import os


import tensorflow_hub as hub
embed = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")

load_dotenv("./.env.coordinator")

os.getenv('')

# url: "amqp://myuser:mypassword@localhost:5672/myvhost"
CELERY_BROKER_URL = (
    f'amqp://'
    f'{os.getenv("RABBITMQ_ADMIN_USERNAME")}:'
    f'{os.getenv("RABBITMQ_ADMIN_PASSWORD")}@'
    f'{os.getenv("RABBITMQ_HOST")}/'
    f'{os.getenv("RABBITMQ_VHOST")}'
)

task_queue_label = "vectorize-task"

queue = Queue(
    task_queue_label,
    Exchange(task_queue_label),
    task_queue_label
)



app = Celery('vectorize_tasks', backend='rpc://', broker=CELERY_BROKER_URL)
app.conf.update(
    task_serializer='pickle',
    accept_content=['pickle', 'json'],  # Ignore other content
    result_serializer='pickle',
    task_queues=[queue],
)

@app.task
def vectorize_and_upload_text(text, database, id): #(text) -> Vector
    '''
    vectorize__and_upload_text

    input: string
    output: numpy
    purpose: This function is used to return a vectorized version of the text
            (Assumes the text is error free)
    '''
    vector = embed([text]).numpy()[0].tolist()
    db = utils.connect(db=database)
    db.documents.update_one(
        {"_id": ObjectId(str(id))},
        { "$set": {
            "textVector" : vector
        }}
    )
    print(f"Vectorized and uploaded {id}.")

@app.task
def ping(msg):
    print(msg)
