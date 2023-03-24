# builtin modules
from warnings import simplefilter
import json
import logging
import os
# installed modules
from celery import chain
from celery import bootsteps
from kombu import Consumer, Exchange, Queue
import boto3
from dotenv import load_dotenv

load_dotenv("./.env.coordinator")

INSTANCE_IDS = str(os.getenv('INSTANCE_IDS')).split(',')
client = boto3.client('ec2')

print(INSTANCE_IDS)

dispatch_queue_label = "vectorize-dispatch"
task_queue_label = "vectorize-task"

# local files
from vectorize_tasks import app, vectorize_and_upload_text

# ignore all future warnings
simplefilter(action='ignore', category=FutureWarning)

dispatch_queue = Queue(
    dispatch_queue_label,
    Exchange(dispatch_queue_label),
    dispatch_queue_label
)

task_queue = Queue(
    task_queue_label,
    Exchange(task_queue_label),
    task_queue_label
)

class WebTaskConsumer(bootsteps.ConsumerStep):

    def get_consumers(self, channel):
        return [Consumer(channel,
                         queues=[dispatch_queue],
                         callbacks=[self.handle_message],
                         accept=['json', 'pickle'])]

    def start_instance(self):
        response = client.start_instances(
            InstanceIds = INSTANCE_IDS # list
            # AdditionalInfo='string',
            # DryRun=True|False
        )
        return response

    def stop_instance(self):
        response = client.stop_instances(
            InstanceIds = INSTANCE_IDS # list
            # Hibernate=True|False,
            # DryRun=True|False,
            # Force=True|False
        )
        return response

    def handle_message(self, body, message):
        print('Received message: {0!r}'.format(body))
        message.ack()
        msg = json.loads(body)
        print('#####################')
        print(msg)
        task = msg['body']['task']
        args = msg['body']['args']
        res = None

        if task == "vectorize_text":
            self.vectorize_and_upload_text(args["text"], args["db"], args["id"])

        if task == "start_instance":
            resp = self.start_instance()
            print(resp)

        if task == "stop_instance":
            resp = self.stop_instance()
            print(resp)
    
    
    def vectorize_and_upload_text(self, text, db, id):
        res = vectorize_and_upload_text.signature(
            args=(text, db, id,),
            kwargs={}
        )
        res.apply_async(queue=task_queue_label)

        # try:
        #     res.apply_async(queue=auth.rabbitmq["task_queue"])
        # except:
        #     logging.warning(f'Task {task} for args {args} was not valid.')
        # return


app.steps['consumer'].add(WebTaskConsumer)