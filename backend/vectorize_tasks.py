import logging, pickle, json, numpy as np
from warnings import simplefilter
from celery import Celery, Task, chain
from kombu import Consumer, Exchange, Queue
import datetime

# ignore all future warnings
simplefilter(action='ignore', category=FutureWarning)

from dotenv import load_dotenv
import os

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

app = Celery('tasks', backend='rpc://', broker=CELERY_BROKER_URL)
app.conf.update(
    task_serializer='pickle',
    accept_content=['pickle'],  # Ignore other content
    result_serializer='pickle',
    task_queues=[queue],
)

def vectorize_text(text): #(text) -> Vector
    '''
    vectorize_text

    input: string
    output: numpy
    purpose: This function is used to return a vectorized version of the text
            (Assumes the text is error free)
    '''
    import tensorflow_hub as hub
    embed = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")
    vector = embed([text]).numpy()[0].tolist()
    return vector