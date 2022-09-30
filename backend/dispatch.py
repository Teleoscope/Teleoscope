# builtin modules
from warnings import simplefilter
import json
import random
import string

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
    

        # These should exactly implement the interface standard
        # Make sure they look like Stomp.js

        match task:

            case ["initialize_teleoscope"]:
                kwargs = {
                        "label": args['label'],
                        "session_id": args["session_id"]
                }
                res = tasks.initialize_teleoscope.signature(
                    args=(),
                    kwargs=kwargs,
                )
                res.apply_async()

            case ["save_teleoscope_state"]:
                kwargs = {
                        "_id": args["_id"],
                        "history_item": args["history_item"]
                }
                res = tasks.save_teleoscope_state.signature(
                    args=(),
                    kwargs=kwargs,
                )
                res.apply_async()

            case ['initialize_session']:
                kwargs = {
                        "username": args["username"],
                        "label": args["label"]
                }
                res = tasks.initialize_session.signature(
                    args=(),
                    kwargs=kwargs,
                )
                res.apply_async()

            case ["save_UI_state"]:
                kwargs = {
                        "session_id": args["session_id"],
                        "history_item": args["history_item"]
                }
                res = tasks.save_UI_state.signature(
                    args=(),
                    kwargs=kwargs,
                )
                res.apply_async()

            case ["reorient"]:
                '''
                res = robj.delay(
                    teleoscope_id=args["teleoscope_id"],
                    positive_docs=args["positive_docs"],
                    negative_docs=args["negative_docs"]
                )
                '''

                workflow = chain(
                    robj.s(teleoscope_id=args["teleoscope_id"],
                        positive_docs=args["positive_docs"],
                        negative_docs=args["negative_docs"]),
                    tasks.save_teleoscope_state.s()
                )

                workflow.apply_async()

            case ["add_group"]:
                kwargs = {
                        "label": args["label"],
                        "color": args["color"],
                        "session_id": args["session_id"]
                }
                res = tasks.add_group.signature(
                    args=(),
                    kwargs=kwargs,
                )
                res.apply_async()

            case ["add_post_to_group"]:
                kwargs = {
                        "group_id": args["group_id"],
                        "post_id": args["post_id"]
                }
                res = tasks.add_post_to_group.signature(
                    args=(),
                    kwargs=kwargs,
                )
                res.apply_async()

            case ["remove_post_from_group"]:
                kwargs = {
                        "group_id": args["group_id"],
                        "post_id": args["post_id"]
                }
                res = tasks.remove_post_from_group.signature(
                    args=(),
                    kwargs=kwargs
                )
                res.apply_async()

            case ["update_group_label"]:
                kwargs = {
                        "group_id": args["group_id"],
                        "label": args["label"]
                }
                res = tasks.update_group_label.signature(
                    args=(),
                    kwargs=kwargs,
                )
                res.apply_async()

            case ["add_note"]:
                kwargs = {
                        "post_id": args["post_id"],
                }
                res = tasks.add_note.signature(
                    args=(),
                    kwargs=kwargs,
                )
                res.apply_async()

            case ["update_note"]:
                kwargs = {
                        "post_id": args["post_id"],
                        "content": args["content"],
                }
                res = tasks.update_note.signature(
                    args=(),
                    kwargs=kwargs,
                )
                res.apply_async()
            
            case ["cluster_by_groups"]:
                kwargs = {
                        "group_id_strings": args["group_id_strings"],
                        "teleoscope_oid": args["teleoscope_oid"],
                        "session_oid": args["session_oid"]
                }
                res = tasks.cluster_by_groups.signature(
                    args=(),
                    kwargs=kwargs,
                )
                res.apply_async()


app.steps['consumer'].add(WebTaskConsumer)
