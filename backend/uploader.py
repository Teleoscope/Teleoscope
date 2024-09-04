import pika
import logging
import json
from . import embeddings
import os

# Initialize logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# environment variables
from dotenv import load_dotenv

load_dotenv()  # This loads the variables from .env


# RabbitMQ connection details
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST")
RABBITMQ_UPLOAD_VECTOR_QUEUE = os.getenv("RABBITMQ_UPLOAD_VECTOR_QUEUE")

# Function to handle vector uploads to Milvus
def upload_vector(ch, method, properties, body):
    message = json.loads(body.decode('utf-8'))
    vector_data = message['vector']
    database = message['database']

    logging.info(f"Received vector for document ID {vector_data['id']} from queue.")

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

    ch.basic_ack(delivery_tag=method.delivery_tag)


# Start consuming messages from the vector queue
def start_upload_worker():
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST.split(":")[0]))
    channel = connection.channel()

    # Declare the vector queue
    channel.queue_declare(queue=RABBITMQ_UPLOAD_VECTOR_QUEUE)

    # Set up the consumer to upload vectors
    channel.basic_consume(queue=RABBITMQ_UPLOAD_VECTOR_QUEUE, on_message_callback=upload_vector)

    logging.info("Waiting for vectors to upload...")
    channel.start_consuming()

if __name__ == "__main__":
    start_upload_worker()
