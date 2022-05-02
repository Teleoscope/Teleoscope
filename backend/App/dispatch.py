'''
- Declares the WebTaskConsumer class to be used in App.py
- Only contains definitions, not a script.
'''

import json, random, string
from warnings import simplefilter
from celery import bootsteps
from kombu import Consumer, Exchange, Queue
from Tasks import tasks
# ignore all future warnings
simplefilter(action='ignore', category=FutureWarning)

# TODO: Recommended to move this into the WebTaskConsumer constructor
systopia = Queue('systopia', Exchange('systopia'), 'systopia')

def get_random_string(length):
    # choose from all lowercase letter
    letters = string.ascii_lowercase
    result_str = ''.join(random.choice(letters) for i in range(length))
    return result_str

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

        # TODO: these should exactly implement the interface standard
        # TODO: make sure they look like Stomp.js
        if b['task'] == "initialize_teleoscope":
            res = tasks.querySearch.signature(
                args=(b['args']['query'], get_random_string(32)),
                kwargs={},
            )
            res.apply_async()

        if b['task'] == "reorient":
            res = tasks.reorient.delay(
                teleoscope_id=b['args']["teleoscope_id"],
                positive_docs=b['args']["positive_docs"],
                negative_docs=b['args']["negative_docs"],
                query=b['args']["query"]
            )

