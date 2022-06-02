# builtin modules
import logging
import pickle
from warnings import simplefilter
import utils
import json
import random
import string

# installed modules
import gridfs
import numpy as np
import tensorflow_hub as hub
from celery import Celery
from celery import bootsteps
from kombu import Consumer, Exchange, Queue

# local files
import auth
import tasks

# Thanks to http://brandonrose.org/clustering!
# and https://towardsdatascience.com/how-to-rank-text-content-by-semantic-similarity-4d2419a84c32

# ignore all future warnings
simplefilter(action='ignore', category=FutureWarning)

queue = Queue(auth.rabbitmq["vhost"], Exchange(auth.rabbitmq["vhost"]), auth.rabbitmq["vhost"])

from tasks import robj, app


def get_random_string(length):
    # choose from all lowercase letter
    letters = string.ascii_lowercase
    result_str = ''.join(random.choice(letters) for i in range(length))
    return result_str

class WebTaskConsumer(bootsteps.ConsumerStep):

    def get_consumers(self, channel):
        return [Consumer(channel,
                         queues=[queue],
                         callbacks=[self.handle_message],
                         accept=['json', 'pickle'])]

    def handle_message(self, body, message):
        print('Received message: {0!r}'.format(body))
        message.ack()
        # not tested below
        b = json.loads(body)

        # TODO: these should exactly implement the interface standard
        # TODO: make sure they look like Stomp.js
        if b['task'] == "initialize_teleoscope":
            res = tasks.initialize_teleoscope.signature(
                args=(),
                kwargs={
                    "label": b['args']['query']
                },
            )
            res.apply_async()
        
        if b['task'] == 'initialize_session':
            res = tasks.initialize_session.signature(
                args=(),
                kwargs={
                    "label": b["args"]["label"]
                },
            )
            res.apply_async()

        if b['task'] == "save_UI_state":
            res = tasks.save_UI_state.signature(
                args=(),
                kwargs={
                    "session_id": b["args"]["session_id"],
                    "history_item": b["args"]["history_item"]
                },
                )
            res.apply_async()
        

        if b['task'] == "reorient":
            res = robj.delay(
                teleoscope_id=b['args']["teleoscope_id"],
                positive_docs=b['args']["positive_docs"],
                negative_docs=b['args']["negative_docs"],
                query=b['args']["query"]
            )



app.steps['consumer'].add(WebTaskConsumer)

