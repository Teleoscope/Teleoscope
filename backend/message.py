from celery import Celery
from kombu import  Exchange, Queue
import os

# environment variables
from dotenv import load_dotenv
load_dotenv("backend/.env")  # This loads the variables from .env


RABBITMQ_USERNAME = os.getenv('RABBITMQ_USERNAME')
RABBITMQ_PASSWORD = os.getenv('RABBITMQ_PASSWORD')
RABBITMQ_HOST = os.getenv('RABBITMQ_HOST')
RABBITMQ_VHOST = os.getenv('RABBITMQ_VHOST')

# Format the RabbitMQ URL for Celery
broker_url = f'amqp://{RABBITMQ_USERNAME}:{RABBITMQ_PASSWORD}@{RABBITMQ_HOST}/{RABBITMQ_VHOST}'


# Create the Celery application instance
queue = Queue("embeddings", Exchange("embeddings"), "embeddings")
app = Celery('messenger', backend='rpc://', broker=broker_url,include=['backend.tasks', 'backend.embeddings'])

app.conf.update(
    task_track_started=True,
    worker_log_format='[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
    worker_task_log_format='[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s',
    task_serializer='pickle',
    accept_content=['pickle', 'json'],  # Ignore other content
    result_serializer='pickle',
    task_queues=[queue],
    worker_concurrency=1
)

task = "backend.embeddings.milvus_import"
kwargs = {"database": "brands", "userid": ""}

app.send_task(task, kwargs=kwargs, queue="embeddings")