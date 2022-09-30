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
        kwargs = {}
        res = None
    

        # These should exactly implement the interface standard
        # Make sure they look like Stomp.js

        match task:
            case ["reorient"]:
                workflow = chain(
                    robj.s(teleoscope_id=args["teleoscope_id"],
                        positive_docs=args["positive_docs"],
                        negative_docs=args["negative_docs"]),
                    tasks.save_teleoscope_state.s()
                )
                workflow.apply_async()

            case ["initialize_teleoscope"]:
                kwargs = {
                        "label": args['label'],
                        "session_id": args["session_id"]
                }
                res = tasks.initialize_teleoscope.apply_async(args=[], kwargs=kwargs)

            case ["save_teleoscope_state"]:
                kwargs = {
                        "_id": args["_id"],
                        "history_item": args["history_item"]
                }
                res = tasks.save_teleoscope_state.apply_async(args=[], kwargs=kwargs)

            case ['initialize_session']:
                kwargs = {
                        "username": args["username"],
                        "label": args["label"]
                }
                res = tasks.initialize_session.apply_async(args=[], kwargs=kwargs)

            case ["save_UI_state"]:
                kwargs = {
                        "session_id": args["session_id"],
                        "history_item": args["history_item"]
                }
                res = tasks.save_UI_state.apply_async(args=[], kwargs=kwargs)

            case ["add_group"]:
                kwargs = {
                        "label": args["label"],
                        "color": args["color"],
                        "session_id": args["session_id"]
                }
                res = tasks.add_group.apply_async(args=[], kwargs=kwargs)

            case ["add_post_to_group"]:
                kwargs = {
                        "group_id": args["group_id"],
                        "post_id": args["post_id"]
                }
                res = tasks.add_post_to_group.apply_async(args=[], kwargs=kwargs)

            case ["remove_post_from_group"]:
                kwargs = {
                        "group_id": args["group_id"],
                        "post_id": args["post_id"]
                }
                res = tasks.remove_post_from_group.apply_async(args=[], kwargs=kwargs)

            case ["update_group_label"]:
                kwargs = {
                        "group_id": args["group_id"],
                        "label": args["label"]
                }
                res = tasks.update_group_label.apply_async(args=[], kwargs=kwargs)

            case ["add_note"]:
                kwargs = {
                        "post_id": args["post_id"],
                }
                res = tasks.add_note.apply_async(args=[], kwargs=kwargs)

            case ["update_note"]:
                kwargs = {
                        "post_id": args["post_id"],
                        "content": args["content"],
                }
                res = tasks.update_note.apply_async(args=[], kwargs=kwargs)
            
            case ["cluster_by_groups"]:
                kwargs = {
                        "group_id_strings": args["group_id_strings"],
                        "teleoscope_oid": args["teleoscope_oid"],
                        "session_oid": args["session_oid"]
                }
                res = tasks.cluster_by_groups.apply_async(args=[], kwargs=kwargs)
            
        try:
            res.get()
        except:
            logging.warning(f'Task for {task} was empty.')


app.steps['consumer'].add(WebTaskConsumer)
