# tasks.py
# builtin modules
from warnings import simplefilter
import json
import logging
import os
import uuid

# installed modules
from celery import bootsteps
from kombu import Consumer, Exchange, Queue

# local files
from backend import tasks

# environment variables
from dotenv import load_dotenv
load_dotenv()  # This loads the variables from .env
import os
RABBITMQ_DISPATCH_QUEUE = os.getenv('RABBITMQ_DISPATCH_QUEUE') 
RABBITMQ_TASK_QUEUE = os.getenv('RABBITMQ_TASK_QUEUE') 

# ignore all future warnings
simplefilter(action="ignore", category=FutureWarning)

dispatch_queue = Queue(
    RABBITMQ_DISPATCH_QUEUE,
    Exchange(RABBITMQ_DISPATCH_QUEUE),
    RABBITMQ_DISPATCH_QUEUE,
)

task_queue = Queue(
    RABBITMQ_TASK_QUEUE,
    Exchange(RABBITMQ_TASK_QUEUE),
    RABBITMQ_TASK_QUEUE,
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
        if isinstance(body, str):
            msg = json.loads(body)
        else:
            msg = body
        task = msg.get("task", "None") 
        args = msg.get("args", ())
        kwargs = msg.get("kwargs", {})
        res = None

        # These should exactly implement the interface standard
        # Make sure they look like Stomp

        match task:
            case "ping":
                res = tasks.ping.signature(args=args, kwargs=kwargs)

            case "vectorize_note":
                res = tasks.vectorize_note.signature(args=args, kwargs=kwargs)
                        
            case "update_nodes":
                res = tasks.update_nodes.signature(args=args, kwargs=kwargs)

            case "generate_xlsx":
                res = tasks.generate_xlsx.signature(args=args, kwargs=kwargs)

            case "chunk_upload":
                res = tasks.chunk_upload.signature(args=args, kwargs=kwargs)
            
            case "delete_storage":
                res = tasks.delete_storage.signature(args=args, kwargs=kwargs)
            
            case "acknowledge_vector_upload":
                res = tasks.acknowledge_vector_upload.signature(args=args, kwargs=kwargs)

        try:
            res.apply_async(queue=RABBITMQ_TASK_QUEUE)
        except Exception as e:
            logging.warning(f"Task {task} for args {args} and kwargs {kwargs} raised exception {e}.")
        return


tasks.app.steps["consumer"].add(WebTaskConsumer)



if __name__ == '__main__':
    worker = tasks.app.Worker(
        include=['backend.dispatch'], 
        hostname=f"hostname=dispatch.{os.getlogin()}@%h{uuid.uuid4()}",
        loglevel="INFO"
    )
    worker.start()
    # tasks.app.worker_main(['worker', '--loglevel=INFO', f"--hostname=dispatch.{os.getlogin()}@%h{uuid.uuid4()}" ])