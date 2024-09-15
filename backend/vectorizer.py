# vectorizer.py

import signal
import pika
import logging
import json
from FlagEmbedding import BGEM3FlagModel
import os
import sys
import time
from dotenv import load_dotenv
from backend import utils

# Initialize logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
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
RABBITMQ_VECTORIZE_QUEUE = check_env_var("RABBITMQ_VECTORIZE_QUEUE")
RABBITMQ_UPLOAD_VECTOR_QUEUE = check_env_var("RABBITMQ_UPLOAD_VECTOR_QUEUE")

RETRY_DELAY = 5  # seconds

# Lazy initialization for the model
model = None

# Publish vectors to the upload vector queue
def publish_vectors(vector_data: list, workspace_id: str, database: str):

    connection = utils.get_connection()
    channel = connection.channel()

    # Declare the vector queue in case it doesn't exist
    channel.queue_declare(queue=RABBITMQ_UPLOAD_VECTOR_QUEUE, durable=True)

    # Prepare the message
    message = json.dumps({
        'database': database,
        'vector_data': vector_data,
        "workspace_id": workspace_id,
    })

    # Publish the message
    channel.basic_publish(exchange='', routing_key=RABBITMQ_UPLOAD_VECTOR_QUEUE, body=message)
    logging.info(f"Published vectors to vector upload queue.")


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
        workspace_id = message.get('workspace_id', '')
        database = message.get('database', 'default')
        
        if len(documents) == 0:
            logging.warning("No documents found in the message.")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return
        
        if workspace_id == '':
            logging.warning("No workspace included.")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return
        

        logging.info(f"Vectorizing {len(documents)} documents for database {database} and workspace {workspace}...")

        # Extract texts and vectorize
        texts = [doc['text'] for doc in documents]
        raw_vecs = model.encode(texts)["dense_vecs"]
        vector_data = [{'id': doc['id'], workspace: workspace, 'vector': vec.tolist()} for doc, vec in zip(documents, raw_vecs)]

        logging.info(f"Vectorization completed. Sending vectors to vector queue.")

        # Publish the vectors
        publish_vectors(vector_data, workspace_id, database)

    except Exception as e:
        logging.error(f"Error during vectorization: {e}")
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)

# Start consuming messages from the document queue
def start_vectorization_worker():
    logging.info("Starting vectorizer worker.")
    
    connection = utils.get_connection()
    channel = connection.channel()
    
    channel.queue_declare(queue=RABBITMQ_VECTORIZE_QUEUE, durable=True)
    logging.info("Setting up consumer...")

    channel.basic_consume(queue=RABBITMQ_VECTORIZE_QUEUE, on_message_callback=vectorize_documents)

    logging.info("Waiting for documents to vectorize...")
    channel.start_consuming()


# Graceful shutdown handler
def graceful_shutdown(signum, frame):
    logging.info(f"Received shutdown signal ({signum}). Closing RabbitMQ connections...")
    sys.exit(0)



if __name__ == "__main__":
    # Register signal handlers for SIGTERM and SIGINT
    signal.signal(signal.SIGTERM, graceful_shutdown)
    signal.signal(signal.SIGINT, graceful_shutdown)  # Handle Ctrl+C
    try:
        start_vectorization_worker()
    except KeyboardInterrupt:
        logging.info("KeyboardInterrupt received. Shutting down gracefully...")
        graceful_shutdown(signal.SIGINT, None)
    except Exception as e:
        logging.error(f"An error occurred: {e}")
        graceful_shutdown(signal.SIGTERM, None)
