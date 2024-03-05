import logging
import itertools
from celery import Celery
from kombu import  Exchange, Queue
import uuid
import os

from warnings import simplefilter
from . import utils
from . import schemas

# environment variables
from dotenv import load_dotenv
load_dotenv()  # This loads the variables from .env
import os
RABBITMQ_USERNAME = os.getenv('RABBITMQ_USERNAME') 
RABBITMQ_PASSWORD = os.getenv('RABBITMQ_PASSWORD') 
RABBITMQ_HOST = os.getenv('RABBITMQ_HOST') 
RABBITMQ_VHOST = os.getenv('RABBITMQ_VHOST') 
RABBITMQ_TASK_QUEUE = os.getenv('RABBITMQ_TASK_QUEUE') 

# ignore all future warnings
simplefilter(action='ignore', category=FutureWarning)


# url: "amqp://myuser:mypassword@localhost:5672/myvhost"
CELERY_BROKER_URL = (
    f'amqp://'
    f'{RABBITMQ_USERNAME}:'
    f'{RABBITMQ_PASSWORD}@'
    f'{RABBITMQ_HOST}/'
    f'{RABBITMQ_VHOST}'
)

queue = Queue("embeddings", Exchange("embeddings"), "embeddings")
app = Celery('embeddings', backend='rpc://', broker=CELERY_BROKER_URL)

app.conf.update(
    task_serializer='pickle',
    accept_content=['pickle', 'json'],  # Ignore other content
    result_serializer='pickle',
    task_queues=[queue],
    worker_concurrency=1
)



@app.task
def milvus_import(*args, 
                database: str, 
                userid: str,
                ):
    from FlagEmbedding import BGEM3FlagModel
    from pymilvus import connections, Collection, utility    

    logging.info(f'Received embedding request for {database} and {userid}.')

    conn = connections.connect(host="127.0.0.1", port=19530, db_name="teleoscope")
    
    collection = None
    if not utility.has_collection(database):
        collection = Collection(
            name=database,
            schema=schemas.create_milvus_schema(1024),
            using='default',
            shards_num=2
        )
    else:
        collection = Collection(database)
    
    mongo_db = utils.connect(db=database)
    
    model = BGEM3FlagModel('BAAI/bge-m3', use_fp16=True) # Setting use_fp16 to True speeds up computation with a slight performance degradation

    documents = mongo_db.documents.find({})
    
    for batch in itertools.batched(documents, 1000):
        ids = [str(doc["_id"]) for doc in batch]
        embeddings = model.encode([doc['text'] for doc in batch])
        collection.insert([ids, embeddings])

    index_params = {
        "metric_type":"IP",
        "index_type":"IVF_FLAT"
    }
    collection.create_index("text_vector", index_params)


if __name__ == '__main__':
    worker = app.Worker(
        include=['backend'],
        hostname=f"embeddings.{os.getlogin()}@%h{uuid.uuid4()}",
        loglevel="INFO"
    )
    worker.start()
    # (['worker', '--loglevel=INFO', f"--hostname=embeddings.{os.getlogin()}@%h{uuid.uuid4()}"])