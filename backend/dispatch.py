# builtin modules
from warnings import simplefilter
import json
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

dispatch_queue = Queue(
    auth.rabbitmq["dispatch_queue"],
    Exchange(auth.rabbitmq["dispatch_queue"]),
    auth.rabbitmq["dispatch_queue"])

task_queue = Queue(
    auth.rabbitmq["task_queue"],
    Exchange(auth.rabbitmq["task_queue"]),
    auth.rabbitmq["task_queue"])

class WebTaskConsumer(bootsteps.ConsumerStep):

    def get_consumers(self, channel):
        return [Consumer(channel,
                         queues=[dispatch_queue],
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
        # Make sure they look like Stomp

        if task == 'initialize_session':
            res = tasks.initialize_session.signature(
                args=(),
                kwargs={
                    "userid": args["userid"],
                    "label": args["label"],
                    "color": args["color"]
                },
            )

        if task == "save_UI_state":
            res = tasks.save_UI_state.signature(
                args=(),
                kwargs={
                    "userid": args["userid"],
                    "session_id": args["session_id"],
                    "bookmarks": args["bookmarks"],
                    "windows": args["windows"],
                },
            )

        if task == "add_user_to_session":
            res = tasks.add_user_to_session.signature(
                args=(),
                kwargs={
                    "userid": args["userid"],
                    "contributor": args["contributor"],
                    "session_id": args["session_id"]
                }
            )

        if task == "initialize_teleoscope":
            res = tasks.initialize_teleoscope.signature(
                args=(),
                kwargs={
                    "userid": args["userid"],
                    "session_id": args["session_id"]
                },
            )

        if task == "save_teleoscope_state":
            res = tasks.save_teleoscope_state.signature(
                args=(),
                kwargs={
                    "_id": args["_id"],
                    "userid": args["userid"],
                    "history_item": args["history_item"]
                },
            )
        
        if task == "recolor_session":
            res = tasks.recolor_session.signature(
                args=(),
                kwargs={
                    "color": args["color"],
                    "userid": args["userid"],
                    "session_id": args["session_id"],
                },
            )

        if task == "recolor_group":
            res = tasks.recolor_group.signature(
                args=(),
                kwargs={
                    "color": args["color"],
                    "userid": args["userid"],
                    "group_id": args["group_id"],
                },
            )

        if task == "relabel_group":
            res = tasks.relabel_group.signature(
                args=(),
                kwargs={
                    "label": args["label"],
                    "userid": args["userid"],
                    "group_id": args["group_id"],
                },
            )


        if task == "reorient":
            magnitude = 0.5
            if "magnitude" in args:
                magnitude = args["magnitude"]
            res = chain(
                robj.s(teleoscope_id=args["teleoscope_id"],
                       positive_docs=args["positive_docs"],
                       negative_docs=args["negative_docs"],
                       magnitude=magnitude,
                       userid=args["userid"]
                ).set(queue=auth.rabbitmq["task_queue"]),
                tasks.save_teleoscope_state.s().set(queue=auth.rabbitmq["task_queue"])
            )
            
            res.apply_async()
            return

        if task == "add_group":
            res = tasks.add_group.signature(
                args=(),
                kwargs={
                    "userid": args["userid"],
                    "label": args["label"],
                    "color": args["color"],
                    "session_id": args["session_id"]
                }
            )

        if task == "remove_group":
            res = tasks.remove_group.signature(
                args=(),
                kwargs={
                    "session_id": args["session_id"],
                    "group_id": args["group_id"],
                    "userid": args["userid"]
                }
            )

        if task == "copy_group":
            res = tasks.copy_group.signature(
                args=(),
                kwargs={
                    "userid": args["userid"],
                    "label": args["label"],
                    "session_id": args["session_id"],
                    "group_id": args["group_id"],
                }
            )

        if task == "add_document_to_group":
            res = tasks.add_document_to_group.signature(
                args=(),
                kwargs={
                    "userid": args["userid"],
                    "group_id": args["group_id"],
                    "document_id": args["document_id"]
                }
            )

        if task == "remove_document_from_group":
            res = tasks.remove_document_from_group.signature(
                args=(),
                kwargs={
                    "userid": args["userid"],
                    "group_id": args["group_id"],
                    "document_id": args["document_id"]
                }
            )

        if task == "update_group_label":
            res = tasks.update_group_label.signature(
                args=(),
                kwargs={
                    "userid": args["userid"],
                    "group_id": args["group_id"],
                    "label": args["label"]
                }
            )

        if task == "add_note":
            res = tasks.add_note.signature(
                args=(),
                kwargs={
                    "userid": args["userid"],
                    "oid": args["oid"],
                    "type": args["type"]
                }
            )

        if task == "update_note":
            res = tasks.update_note.signature(
                args=(),
                kwargs={
                    "userid": args["userid"],
                    "document_id": args["document_id"],
                    "content": args["content"],
                }
            )
        

        if task == "cluster_by_groups":
            res = tasks.cluster_by_groups.signature(
                args=(),
                kwargs={
                    "userid": args["userid"],
                    "group_id_strings": args["group_id_strings"],
                    "session_oid": args["session_oid"]
                }
            )

        if task == "register_account":
            res = tasks.register_account.signature(
                args=(),
                kwargs={
                    "firstName": args["firstName"],
                    "lastName": args["lastName"],
                    "password": args["password"],
                    "username": args["username"]
                }
            )

        try:
            res.apply_async(queue=auth.rabbitmq["task_queue"])
        except:
            logging.warning(f'Task {task} for args {args} was not valid.')
        return


app.steps['consumer'].add(WebTaskConsumer)
