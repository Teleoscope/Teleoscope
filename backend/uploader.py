import pika
import logging
import json

from backend import utils
from backend import embeddings
import os
import uuid 

# Initialize logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# environment variables
from dotenv import load_dotenv

load_dotenv()  # This loads the variables from .env


# RabbitMQ connection details
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST")
RABBITMQ_PORT = os.getenv("RABBITMQ_PORT")
RABBITMQ_UPLOAD_VECTOR_QUEUE = os.getenv("RABBITMQ_UPLOAD_VECTOR_QUEUE")
RABBITMQ_TASK_QUEUE = os.getenv("RABBITMQ_TASK_QUEUE")

# Function to handle vector uploads to Milvus
def upload_vectors(ch, method, properties, body):
    message = json.loads(body.decode('utf-8'))
    vector_data = message['vector_data']
    database = message['database']

    logging.info(f"Received vectors for {len(vector_data)} for database {database}.")

    # Connect to Milvus (or other storage)
    client = embeddings.connect()
    embeddings.milvus_setup(client, collection_name=database)

    try:
        # Upload vector to the database
        res = client.upsert(collection_name=database, data=[vector_data])
        logging.info(f"Uploaded vector for document ID {vector_data['id']} to {database}.")
    except Exception as e:
        logging.error(f"Error uploading vector data: {e}")
    finally:
        client.close()
    
    task_data = {
        'task': 'backend.tasks.acknowledge_vector_upload',  # Celery task name
        'id': uuid.uuid4(),  # Unique ID for the task
        'args': [],  # Arguments for the task
        'kwargs': {
            "database": database,
            "ids": [vd["id"] for vd in vector_data]
        },  # Keyword arguments if any
    }

    utils.publish("tasks", task_data, RABBITMQ_HOST, RABBITMQ_TASK_QUEUE)

    ch.basic_ack(delivery_tag=method.delivery_tag)


# Start consuming messages from the vector queue
def start_upload_worker():
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_PORT, port=RABBITMQ_PORT))
    channel = connection.channel()

    # Declare the vector queue
    channel.queue_declare(queue=RABBITMQ_UPLOAD_VECTOR_QUEUE)

    # Set up the consumer to upload vectors
    channel.basic_consume(queue=RABBITMQ_UPLOAD_VECTOR_QUEUE, on_message_callback=upload_vectors)

    logging.info("Waiting for vectors to upload...")
    channel.start_consuming()

if __name__ == "__main__":
    start_upload_worker()
