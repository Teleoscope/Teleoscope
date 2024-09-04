import pika
import logging
import json
from FlagEmbedding import BGEM3FlagModel
import os

# Initialize logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Load the model once at startup
model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=True)
logging.info("Model loaded successfully.")

# environment variables
from dotenv import load_dotenv

load_dotenv()  # This loads the variables from .env

# RabbitMQ connection details
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST")
RABBITMQ_VECTORIZE_QUEUE = os.getenv("RABBITMQ_VECTORIZE_QUEUE")
RABBITMQ_UPLOAD_VECTOR_QUEUE = os.getenv("RABBITMQ_UPLOAD_VECTOR_QUEUE")

# Connect to RabbitMQ
def publish_vectors(vector_data: list, database: str):
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST.split(":")[0]))
    channel = connection.channel()

    # Declare the vector queue
    channel.queue_declare(queue=RABBITMQ_UPLOAD_VECTOR_QUEUE)

    # Publish each vector to the queue
    
    message = json.dumps({
        'database': database,
        'vector_data': vector_data
    })
    channel.basic_publish(exchange='', routing_key=RABBITMQ_UPLOAD_VECTOR_QUEUE, body=message)
    logging.info(f"Published vectors to vector upload queue.")

    connection.close()

# Callback function to handle incoming messages from RabbitMQ
def vectorize_documents(ch, method, properties, body):
    message = json.loads(body.decode('utf-8'))
    documents = message['documents']
    database = message['database']

    try:
        texts = [doc['text'] for doc in documents]
        logging.info(f"Vectorizing {len(texts)} documents...")

        # Vectorize the documents
        raw_vecs = model.encode(texts)["dense_vecs"]
        vector_data = [{'id': doc['id'], 'vector': vec.tolist()} for doc, vec in zip(documents, raw_vecs)]

        logging.info(f"Vectorization completed. Sending vectors to vector queue.")

        # Publish vectors to the vector queue for uploading
        publish_vectors(vector_data, database)

    except Exception as e:
        logging.error(f"Error during vectorization: {e}")

    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)

# Start consuming messages from the document queue
def start_vectorization_worker():
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST.split(":")[0]))
    channel = connection.channel()

    # Declare the document queue
    channel.queue_declare(queue=RABBITMQ_VECTORIZE_QUEUE)

    # Set up the consumer to process document batches
    channel.basic_consume(queue=RABBITMQ_VECTORIZE_QUEUE, on_message_callback=vectorize_documents)

    logging.info("Waiting for documents to vectorize...")
    channel.start_consuming()

if __name__ == "__main__":
    start_vectorization_worker()
