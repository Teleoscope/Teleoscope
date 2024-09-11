# uploader.py
import logging
import json
from pprint import pformat

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

# Function to check if required environment variables are set
def check_env_var(var_name: str):
    value = os.getenv(var_name)
    if not value:
        raise EnvironmentError(f"{var_name} environment variable is not set. Please configure it before running the script.")
    return value

# Check and load environment variables
RABBITMQ_TASK_QUEUE = check_env_var("RABBITMQ_TASK_QUEUE")
RABBITMQ_DISPATCH_QUEUE = check_env_var("RABBITMQ_DISPATCH_QUEUE")
RABBITMQ_HOST = check_env_var("RABBITMQ_HOST")
RABBITMQ_PORT = int(check_env_var("RABBITMQ_PORT"))
RABBITMQ_VHOST = check_env_var("RABBITMQ_VHOST")
RABBITMQ_VECTORIZE_QUEUE = check_env_var("RABBITMQ_VECTORIZE_QUEUE")
RABBITMQ_UPLOAD_VECTOR_QUEUE = check_env_var("RABBITMQ_UPLOAD_VECTOR_QUEUE")

rabbitmq_pool = utils.RabbitMQConnectionPool()

# Function to handle vector uploads to Milvus
def upload_vectors(ch, method, properties, body):
    message = json.loads(body.decode('utf-8'))
    vector_data = message.get('vector_data', [])
    database = message['database']

    logging.info(f"Received vectors for {len(vector_data)} for database {database}.")

    # Connect to Milvus (or other storage)
    client = embeddings.connect()

    embeddings.milvus_setup(client, collection_name=database)

    try:
        # Upload vector to the database
        logging.info(f"Attempting to upload {len(vector_data)} vectors...")
        if (len(vector_data) > 0):
            logging.info(f"Keys of data are {vector_data[0].keys()}.")
            logging.info(f"Dimensions of vectors are {len(vector_data[0].get("vector",[]))}.")
            logging.info(f"ID of first vector is {vector_data[0].get("id","")}.")
        res = client.upsert(collection_name=database, data=vector_data)
        if not res:  # Check if result is None or contains error codes
            logging.error(f"Vector upload to {database} failed.")
        else:
            logging.info(f"Successfully uploaded {len(vector_data)} vectors to {database}.")

        logging.info(f"Uploaded {len(vector_data)} vectors to {database}.")

    except Exception as e:
        logging.error(f"Error uploading vector data: {e}")
        logging.error(f"Pretty printing bad data: {pformat(message)}")
    finally:
        client.close()
    
    task_data = {
        'task': 'acknowledge_vector_upload',  # Celery task name
        'id': str(uuid.uuid4()),  # Unique ID for the task
        'args': [],  # Arguments for the task
        'kwargs': {
            "database": database,
            "ids": [vd["id"] for vd in vector_data]
        },  # Keyword arguments if any
    }

    utils.publish(RABBITMQ_DISPATCH_QUEUE, json.dumps(task_data))

    ch.basic_ack(delivery_tag=method.delivery_tag)


# Start consuming messages from the vector queue
def start_upload_worker():
    channel = rabbitmq_pool.get_channel()

    # Declare the vector queue
    channel.queue_declare(queue=RABBITMQ_UPLOAD_VECTOR_QUEUE, durable=True)

    # Set up the consumer to upload vectors
    channel.basic_consume(queue=RABBITMQ_UPLOAD_VECTOR_QUEUE, on_message_callback=upload_vectors)

    logging.info("Waiting for vectors to upload...")
    channel.start_consuming()

if __name__ == "__main__":
    start_upload_worker()
