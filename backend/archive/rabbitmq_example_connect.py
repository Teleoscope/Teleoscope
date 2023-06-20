#!/usr/bin/env python
import pika
import os
from dotenv import load_dotenv
import json
import utils
import time
load_dotenv("./.env.coordinator")

RABBITMQ_ADMIN_USERNAME = os.getenv("RABBITMQ_ADMIN_USERNAME")
RABBITMQ_ADMIN_PASSWORD = os.getenv("RABBITMQ_ADMIN_PASSWORD")
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST")
RABBITMQ_VHOST = os.getenv("RABBITMQ_VHOST")

dispatch_queue = "vectorize-dispatch"
task_queue = "vectorize-task"

credentials = pika.PlainCredentials(
    username=RABBITMQ_ADMIN_USERNAME,
    password=RABBITMQ_ADMIN_PASSWORD
)

connection = pika.BlockingConnection(
    pika.ConnectionParameters(
    host=RABBITMQ_HOST,
    virtual_host=RABBITMQ_VHOST,
    credentials=credentials
    )
)
channel = connection.channel()

def connect(queue, task, args):

    channel.queue_declare(queue=queue, durable=True)

    headers = { "content_type": "application/json", "content_encoding": "utf-8" }
    body = {
        "task": task,
        "args": args
    }

    message = {
        "destination": f'/queue/{queue}',
        "headers": headers,
        "body": body,
    }

    channel.basic_publish(
        exchange=queue,
        routing_key=queue,
        body=json.dumps(message),
        properties=pika.BasicProperties(
            delivery_mode=pika.spec.PERSISTENT_DELIVERY_MODE
        ))
    print(" [x] Sent %r" % message)


db = utils.connect(db="nursing")
cursor = db.documents.find({})
for doc in cursor:
    if len(doc["textVector"]) == 0:
        time.sleep(1)
        connect(dispatch_queue, "vectorize_and_upload_text", {"text": doc["text"], "db": "nursing", "id": str(doc["_id"])})

connection.close()
