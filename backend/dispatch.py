# builtin modules
from warnings import simplefilter
import json
import random
import string
import logging

# installed modules
from celery import chain
from celery import bootsteps
from kombu import Consumer, Exchange, Queue

# local files
import auth
import tasks

from tasks import robj, app

# Thanks to http://brandonrose.org/clustering!
# and https://towardsdatascience.com/how-to-rank-text-content-by-semantic-similarity-4d2419a84c32

# ignore all future warnings
simplefilter(action='ignore', category=FutureWarning)

queue = Queue(
    auth.rabbitmq["vhost"],
    Exchange(auth.rabbitmq["vhost"]),
    auth.rabbitmq["vhost"])


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
        msg = json.loads(body)
        task = msg['task']
        args = msg['args']
        res = None

        # These should exactly implement the interface standard
        # Make sure they look like Stomp.js
    

        if task == "initialize_teleoscope":
            res = tasks.initialize_teleoscope.signature(
                args=(),
                kwargs={
                    "label": args['label'],
                    "session_id": args["session_id"]
                },
            )

        if task == "save_teleoscope_state":
            res = tasks.save_teleoscope_state.signature(
                args=(),
                kwargs={
                    "_id": args["_id"],
                    "history_item": args["history_item"]
                },
            )

        if task == 'initialize_session':
            res = tasks.initialize_session.signature(
                args=(),
                kwargs={
                    "username": args["username"],
                    "label": args["label"],
                    "color": args["color"]
                },
            )

        if task == "add_user_to_session":
            res = tasks.add_group.signature(
                args=(),
                kwargs={
                    "username": args["username"],
                    "session_id": args["session_id"]
                }
            )

        if task == "save_UI_state":
            res = tasks.save_UI_state.signature(
                args=(),
                kwargs={
                    "session_id": args["session_id"],
                    "history_item": args["history_item"]
                },
            )

        if task == "reorient":
            res = chain(
                robj.s(teleoscope_id=args["teleoscope_id"],
                       positive_docs=args["positive_docs"],
                       negative_docs=args["negative_docs"]),
                tasks.save_teleoscope_state.s()
            )

        if task == "add_group":
            res = tasks.add_group.signature(
                args=(),
                kwargs={
                    "label": args["label"],
                    "color": args["color"],
                    "session_id": args["session_id"]
                }
            )

        if task == "add_post_to_group":
            res = tasks.add_post_to_group.signature(
                args=(),
                kwargs={
                    "group_id": args["group_id"],
                    "post_id": args["post_id"]
                }
            )

        if task == "remove_post_from_group":
            res = tasks.remove_post_from_group.signature(
                args=(),
                kwargs={
                    "group_id": args["group_id"],
                    "post_id": args["post_id"]
                }
            )

        if task == "update_group_label":
            res = tasks.update_group_label.signature(
                args=(),
                kwargs={
                    "group_id": args["group_id"],
                    "label": args["label"]
                }
            )

        if task == "add_note":
            res = tasks.add_note.signature(
                args=(),
                kwargs={
                    "post_id": args["post_id"],
                }
            )

        if task == "update_note":
            res = tasks.update_note.signature(
                args=(),
                kwargs={
                    "post_id": args["post_id"],
                    "content": args["content"],
                }
            )
        
        if task == "cluster_by_groups":
            res = tasks.cluster_by_groups.signature(
                args=(),
                kwargs={
                    "group_id_strings": args["group_id_strings"],
                    "teleoscope_oid": args["teleoscope_oid"],
                    "session_oid": args["session_oid"]
                }
            )

        try:
            res.apply_async()
        except:
            logging.warning(f'Task {task} for args {args} was not valid.')


app.steps['consumer'].add(WebTaskConsumer)
