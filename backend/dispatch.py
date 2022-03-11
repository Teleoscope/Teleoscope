# builtin modules
import logging
import pickle
from warnings import simplefilter
import utils

# installed modules
import gridfs
import numpy as np
import tensorflow_hub as hub
from celery import Celery
from celery import bootsteps
from kombu import Consumer, Exchange, Queue

# local files
import auth
from tasks import robj

# Thanks to http://brandonrose.org/clustering!
# and https://towardsdatascience.com/how-to-rank-text-content-by-semantic-similarity-4d2419a84c32

# ignore all future warnings
simplefilter(action='ignore', category=FutureWarning)

systopia = Queue('systopia', Exchange('systopia'), 'systopia')

# url: "amqp://myuser:mypassword@localhost:5672/myvhost"
celery_broker_url = (
    f'pyamqp://'
    f'{auth.rabbitmq["username"]}:'
    f'{auth.rabbitmq["password"]}@'
    f'{auth.rabbitmq["host"]}/'
    f'{auth.rabbitmq["vhost"]}'
)
app = Celery('tasks', backend='rpc://', broker=celery_broker_url)
app.conf.update(
    task_serializer='json',
    accept_content=['json'],  # Ignore other content
    result_serializer='json',
    enable_utc=True,
)

class WebTaskConsumer(bootsteps.ConsumerStep):

    def get_consumers(self, channel):
        return [Consumer(channel,
                         queues=[systopia],
                         callbacks=[self.handle_message],
                         accept=['json'])]

    def handle_message(self, body, message):
        print('Received message: {0!r}'.format(body))
        message.ack()
        if ("teleoscope_id" in body.keys()) and (positive_docs in body.keys()) and (negative_docs in body.keys()):
            res = robj.delay(
                teleoscope_id=body.teleoscope_id, 
                positive_docs=body.positive_docs, 
                negative_docs=body.negative_docs, 
                query='mom'
            )

app.steps['consumer'].add(WebTaskConsumer)

# @app.task
# def hello(hi="hi"):
#     print("hello", hi)


# @app.task
# def dispatch(requests={}):
#     logging.info(
#         f"Running requests for "
#         f"{requests["request_id"]} at time "
#         f"{requests["system_time"]}.")
#     if "query" in requests.keys():
#         run_query_init(requests["query"])
