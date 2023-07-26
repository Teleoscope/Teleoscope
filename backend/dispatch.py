# builtin modules
from warnings import simplefilter
import json
import logging
import os

# installed modules
from celery import chain
from celery import bootsteps
from kombu import Consumer, Exchange, Queue

# local files
from . import auth
from . import tasks

# ignore all future warnings
simplefilter(action="ignore", category=FutureWarning)

dispatch_queue = Queue(
    auth.rabbitmq["dispatch_queue"],
    Exchange(auth.rabbitmq["dispatch_queue"]),
    auth.rabbitmq["dispatch_queue"],
)

task_queue = Queue(
    auth.rabbitmq["task_queue"],
    Exchange(auth.rabbitmq["task_queue"]),
    auth.rabbitmq["task_queue"],
)

class WebTaskConsumer(bootsteps.ConsumerStep):
    def get_consumers(self, channel):
        return [
            Consumer(
                channel,
                queues=[dispatch_queue],
                callbacks=[self.handle_message],
                accept=["json", "pickle"],
            )
        ]

    def handle_message(self, body, message):
        logging.debug("Received message: {0!r}".format(body))
        message.ack()
        msg = json.loads(body)
        task = msg["task"]
        kwargs = msg["args"]
        res = None

        # These should exactly implement the interface standard
        # Make sure they look like Stomp

        match task:
            case "register_account":
                res = tasks.register_account.signature(args=(), kwargs=kwargs)

            case "initialize_workspace":
                res = tasks.initialize_workspace.signature(args=(), kwargs=kwargs)

            case "add_contributor":
                res = tasks.add_contributor.signature(args=(), kwargs=kwargs)

            case "remove_contributor":
                res = tasks.remove_contributor.signature(args=(), kwargs=kwargs)

            case "mark":
                res = tasks.mark.signature(args=(), kwargs=kwargs)

            case "copy_cluster":
                res = tasks.copy_cluster.signature(args=(), kwargs=kwargs)

            case "initialize_workflow":
                res = tasks.initialize_workflow.signature(args=(), kwargs=kwargs)
                
            case "remove_workflow":
                res = tasks.remove_workflow.signature(args=(), kwargs=kwargs)

            case "save_UI_state":
                res = tasks.save_UI_state.signature(args=(), kwargs=kwargs)

            case "recolor_workflow":
                res = tasks.recolor_workflow.signature(args=(), kwargs=kwargs)

            case "recolor_group":
                res = tasks.recolor_group.signature(args=(), kwargs=kwargs)

            case "relabel_group":
                res = tasks.relabel_group.signature(args=(), kwargs=kwargs)

            case "relabel_workflow":
                res = tasks.relabel_workflow.signature(args=(), kwargs=kwargs)

            case "remove_group":
                res = tasks.remove_group.signature(args=(), kwargs=kwargs)

            case "remove_teleoscope":
                res = tasks.remove_teleoscope.signature(args=(), kwargs=kwargs)

            case "copy_group":
                res = tasks.copy_group.signature(args=(), kwargs=kwargs)

            case "add_document_to_group":
                res = tasks.add_document_to_group.signature(args=(), kwargs=kwargs)

            case "remove_document_from_group":
                res = tasks.remove_document_from_group.signature(args=(), kwargs=kwargs)

            case "update_group_label":
                res = tasks.update_group_label.signature(args=(), kwargs=kwargs)

            case "add_note":
                res = tasks.add_note.signature(args=(), kwargs=kwargs)

            case "remove_note":
                res = tasks.remove_note.signature(args=(), kwargs=kwargs)

            case "update_note":
                res = tasks.update_note.signature(args=(), kwargs=kwargs)

            case "relabel_note":
                res = tasks.relabel_note.signature(args=(), kwargs=kwargs)

            case "snippet":
                res = tasks.snippet.signature(args=(), kwargs=kwargs)

            case "add_item":
                res = tasks.add_item.signature(args=(), kwargs=kwargs)

            case "ping":
                res = tasks.ping.signature(args=(), kwargs=kwargs)
            
            case "make_edge":
                res = tasks.make_edge.signature(args=(), kwargs=kwargs)

            case "remove_edge":
                res = tasks.remove_edge.signature(args=(), kwargs=kwargs)
            
            case "update_search":
                res = tasks.update_search.signature(args=(), kwargs=kwargs)

            # TODO: refactor to be like above syntax when we're sure that everything
            # has all arguments
            case "add_group":
                documents = []
                if "documents" in kwargs:
                    documents = kwargs["documents"]

                res = tasks.add_group.signature(
                    args=(),
                    kwargs={
                        **kwargs,
                        "documents": documents,
                    },
                )
        try:
            res.apply_async(queue=auth.rabbitmq["task_queue"])
        except Exception as e:
            logging.warning(f"Task {task} for kwargs {kwargs} raised exception {e}.")
        return


tasks.app.steps["consumer"].add(WebTaskConsumer)


if __name__ == '__main__':
    tasks.app.worker_main(['worker', '--loglevel=INFO', f"--hostname=dispatch.{os.getlogin()}@%h" ])