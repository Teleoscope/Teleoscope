# vectorizer.py
import signal
import logging
import json
from FlagEmbedding import BGEM3FlagModel
import sys
import os
from dotenv import load_dotenv
from backend import utils
import torch
import time
import threading

# Initialize logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S,%f',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logging.getLogger('pika').setLevel(logging.WARNING)

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
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'

RETRY_DELAY = 5  # seconds
IDLE_SHUTDOWN_TIME = 60 * 60  # 60 minutes in seconds

# Lazy initialization for the model
model = None
last_processed_time = time.time()  # Record the time of the last document processed

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

def load_model():
    global model  # Ensure we refer to the global model variable
    if model is None:
        logging.info("Checking for GPU...")
        if torch.cuda.is_available():
            device = torch.device("cuda")
            logging.info("Found GPU.")
        else:
            device = torch.device("cpu")
            logging.info("No GPU available. Using CPU.")
        
        logging.info("Loading model...")
        model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=True, device=device)
        logging.info("Model loaded successfully.")



    


# Callback function to handle incoming messages from RabbitMQ
def vectorize_documents(ch, method, properties, body):
    global model, last_processed_time  # Ensure we refer to the global model variable
    
    # Lazy load the model if it's not already loaded
    load_model()
    
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

        logging.info(f"Vectorizing {len(documents)} documents for database {database} and workspace {workspace_id}...")

        # Extract texts and vectorize
        batch_size = 128
        texts = [doc['text'] for doc in documents]
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            raw_vecs = model.encode(batch_texts)["dense_vecs"]
            
            vector_data = [{'id': doc['id'], 'vector': vec.tolist()} for doc, vec in zip(documents, raw_vecs)]

            logging.info(f"Vectorization completed. Sending vectors to vector queue.")

            # Publish the vectors
            publish_vectors(vector_data, workspace_id, database)
        
        # Update the last processed time    
        last_processed_time = time.time()
        
        # Clear cache
        torch.cuda.empty_cache()

    except Exception as e:
        logging.error(f"Error during vectorization: {e}")
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)

# Idle shutdown watcher thread
def idle_shutdown_watcher():
    while True:
        idle_time = time.time() - last_processed_time
        if idle_time >= IDLE_SHUTDOWN_TIME:
            logging.info("No activity for 60 minutes. Initiating graceful shutdown.")
            # Call the system's shutdown command with a 1-minute delay
            os.system('sudo shutdown -h +1')  # Shutdown after 1 minute

            graceful_shutdown(signal.SIGTERM, None)

        time.sleep(60)  # Check every minute

# Start consuming messages from the document queue
def start_vectorization_worker():
    logging.info("Starting vectorizer worker.")
    
    connection = utils.get_connection()
    channel = connection.channel()
    
    channel.queue_declare(queue=RABBITMQ_VECTORIZE_QUEUE, durable=True)
    logging.info("Setting up consumer...")

    channel.basic_consume(queue=RABBITMQ_VECTORIZE_QUEUE, on_message_callback=vectorize_documents)

    logging.info("Waiting for documents to vectorize...")
    
    # Start the idle shutdown watcher in a separate thread
    shutdown_thread = threading.Thread(target=idle_shutdown_watcher, daemon=True)
    shutdown_thread.start()

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
