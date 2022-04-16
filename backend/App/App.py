'''
- This file is the main entry point for the application.
- Celery is initialized here via a shell script on the hosting server.
'''
import os
from os.path import dirname, realpath
import logging

# Set the environment variable for the application
# This is required so that subfolders can be imported and can import parent folders
curr_file_path = dirname(realpath(__file__))
parent_path = dirname(curr_file_path)
print(parent_path)
os.environ["PYTHONPATH"] = parent_path

logging.info(parent_path)
from backend import auth # **make sure to import auth after setting the environment variable**
from warnings import simplefilter
from celery import Celery
from dispatch import WebTaskConsumer
# ignore all future warnings
simplefilter(action='ignore', category=FutureWarning)

# url: "amqp://myuser:mypassword@localhost:5672/myvhost"
CELERY_BROKER_URL = (
    f'amqp://'
    f'{auth.rabbitmq["username"]}:'
    f'{auth.rabbitmq["password"]}@'
    f'{auth.rabbitmq["host"]}/'
    f'{auth.rabbitmq["vhost"]}'
)

app = Celery('App', backend='rpc://', broker=CELERY_BROKER_URL)

app.conf.update(
    task_serializer='pickle',
    accept_content=['pickle'],  # Ignore other content
    result_serializer='pickle',
)

'''
App Related Registrations
'''
# Add WebTaskConsumer to the Celery app
app.steps['consumer'].add(WebTaskConsumer)
