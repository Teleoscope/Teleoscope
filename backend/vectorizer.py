import pika
import logging
import json
from FlagEmbedding import BGEM3FlagModel
import os
import time
from dotenv import load_dotenv

from backend import utils

# Initialize logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Load environment variables
load_dotenv()

# Function to check if required environment variables are set
def check_env_var(var_name: str):
    value = os.getenv(var_name)
    if not value:
        raise EnvironmentError(f"{var_name} environment variable is not set. Please configure it before running the script.")
    return value

# Check and load environment variables
RABBITMQ_HOST = check_env_var("RABBITMQ_HOST")
RABBITMQ_PORT = int(check_env_var("RABBITMQ_PORT"))
RABBITMQ_VHOST = check_env_var("RABBITMQ_VHOST")
RABBITMQ_VECTORIZE_QUEUE = check_env_var("RABBITMQ_VECTORIZE_QUEUE")
RABBITMQ_UPLOAD_VECTOR_QUEUE = check_env_var("RABBITMQ_UPLOAD_VECTOR_QUEUE")
RETRY_DELAY = 5  # seconds

# Lazy initialization for the model
model = None

# Publish vectors to the upload vector queue
def publish_vectors(vector_data: list, database: str):
    connection = None
    try:
        channel = utils.pika_connect()

        # Declare the vector queue in case it doesn't exist
        channel.queue_declare(queue=RABBITMQ_UPLOAD_VECTOR_QUEUE, durable=True)

        # Prepare the message
        message = json.dumps({
            'database': database,
            'vector_data': vector_data
        })

        # Publish the message
        channel.basic_publish(exchange='', routing_key=RABBITMQ_UPLOAD_VECTOR_QUEUE, body=message)
        logging.info(f"Published vectors to vector upload queue.")
        
    except pika.exceptions.AMQPConnectionError as e:
        logging.error(f"Connection error when publishing vectors: {e}. Retrying in {RETRY_DELAY} seconds...")
        time.sleep(RETRY_DELAY)
        publish_vectors(vector_data, database)  # Retry the publish
    except Exception as e:
        logging.error(f"Error publishing vectors: {e}")
    finally:
        if channel.connection and channel.connection.is_open:
            channel.connection.close()

# Callback function to handle incoming messages from RabbitMQ
def vectorize_documents(ch, method, properties, body):
    global model  # Ensure we refer to the global model variable
    
    # Lazy load the model if it's not already loaded
    if model is None:
        logging.info("Loading model...")
        model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=True)
        logging.info("Model loaded successfully.")
    
    try:
        message = json.loads(body.decode('utf-8'))
        documents = message.get('documents', [])
        database = message.get('database', 'default')

        if not documents:
            logging.warning("No documents found in the message.")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        logging.info(f"Vectorizing {len(documents)} documents...")

        # Extract texts and vectorize
        texts = [doc['text'] for doc in documents]
        raw_vecs = model.encode(texts)["dense_vecs"]
        vector_data = [{'id': doc['id'], 'vector': vec.tolist()} for doc, vec in zip(documents, raw_vecs)]

        logging.info(f"Vectorization completed. Sending vectors to vector queue.")

        # Publish the vectors
        publish_vectors(vector_data, database)

    except Exception as e:
        logging.error(f"Error during vectorization: {e}")
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)

# Start consuming messages from the document queue
def start_vectorization_worker():
    while True:
        try:
            # Establish a connection to RabbitMQ
            channel = utils.pika_connect()

            # Declare the document queue (ensure it is durable and survives RabbitMQ restarts)
            channel.queue_declare(queue=RABBITMQ_VECTORIZE_QUEUE, durable=True)

            # Set up the consumer to process document batches
            channel.basic_consume(queue=RABBITMQ_VECTORIZE_QUEUE, on_message_callback=vectorize_documents)

            logging.info("Waiting for documents to vectorize...")
            channel.start_consuming()

        except pika.exceptions.AMQPConnectionError as e:
            logging.error(f"Connection to RabbitMQ failed: {e}. Retrying in {RETRY_DELAY} seconds...")
            time.sleep(RETRY_DELAY)
        except Exception as e:
            logging.error(f"An unexpected error occurred: {e}")
            time.sleep(RETRY_DELAY)
        finally:
            if 'connection' in locals() and channel.connection.is_open:
                channel.connection.close()

if __name__ == "__main__":
    start_vectorization_worker()
