# builtin modules
import logging
import pickle
from warnings import simplefilter
import utils
import json

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

systopia = Queue('systopia', Exchange('systopia'), 'systopia')

from tasks import robj, app

class WebTaskConsumer(bootsteps.ConsumerStep):

    def get_consumers(self, channel):
        return [Consumer(channel,
                         queues=[systopia],
                         callbacks=[self.handle_message],
                         accept=['json', 'pickle'])]

    def handle_message(self, body, message):
        print('Received message: {0!r}'.format(body))
        message.ack()
        # not tested below
        b = json.loads(body)
        if ("query" in b.keys() and "teleoscope_id" in b.keys()) and ("positive_docs" in b.keys()) and ("negative_docs" in b.keys()):
            res = robj.delay(
                teleoscope_id=b["teleoscope_id"],
                positive_docs=b["positive_docs"],
                negative_docs=b["negative_docs"],
                query=b["query"]
            )

app.steps['consumer'].add(WebTaskConsumer)
