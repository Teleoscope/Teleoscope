import time
import logging
import os
import sys
import boto3
from botocore.exceptions import ClientError
from backend import utils

# Function to check if required environment variables are set
def check_env_var(var_name: str):
    value = os.getenv(var_name)
    if not value:
        raise EnvironmentError(f"{var_name} environment variable is not set. Please configure it before running the script.")
    return value

# Check and load environment variables
RABBITMQ_VECTORIZE_QUEUE = check_env_var("RABBITMQ_VECTORIZE_QUEUE")
EC2_VECTORIZE_INSTANCE = check_env_var("EC2_VECTORIZE_INSTANCE")
EC2_VECTORDB_INSTANCE = check_env_var("EC2_VECTORDB_INSTANCE")
RABBITMQ_VHOST = check_env_var("RABBITMQ_VHOST")

# Initialize logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S,%f',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logging.getLogger('pika').setLevel(logging.WARNING)


ec2_client = boto3.client('ec2', region_name='ca-central-1')

def start_ec2_instance(instance_id):
    try:
        response = ec2_client.start_instances(InstanceIds=[instance_id])
        logging.info(f"Started EC2 instance: {instance_id}")
        return response
    except ClientError as e:
        logging.error(f"Failed to start EC2 instance: {e}")
        return None
    

def get_queue_size(queue_name):
    try:
        connection = utils.get_connection()
        channel = connection.channel()

        # Get the queue information without consuming messages
        queue = channel.queue_declare(queue=queue_name, passive=True)
        message_count = queue.method.message_count
        connection.close()

        return message_count
    except Exception as e:
        logging.error(f"Failed to connect to RabbitMQ or retrieve queue size: {e}")
        return None


def get_instance_status(instance_id):
    """Check the current status of the EC2 instance."""
    try:
        response = ec2_client.describe_instance_status(InstanceIds=[instance_id])
        
        if not response['InstanceStatuses']:
            # No statuses returned, means the instance is stopped
            return 'stopped'
        
        status = response['InstanceStatuses'][0]['InstanceState']['Name']
        logging.info(f"Instance {instance_id} status: {status}")
        return status
    except ClientError as e:
        logging.error(f"Error checking EC2 instance status: {e}")
        return None


def monitor_queue(queue_name, check_interval):
    while True:
        logging.info(f"Monitoring {queue_name} and instance {EC2_VECTORIZE_INSTANCE}.")
        queue_size = get_queue_size(queue_name)
        instance_status = get_instance_status(EC2_VECTORIZE_INSTANCE)

        if queue_size is None:
            logging.error(f"Could not retrieve the size of queue '{queue_name}'")
            continue  # Skip the rest of the loop and retry on the next interval

        if queue_size > 0:
            if instance_status != 'running':
                logging.info(f"Queue has {queue_size} messages, starting EC2 instance {EC2_VECTORIZE_INSTANCE}...")
                start_ec2_instance(EC2_VECTORIZE_INSTANCE)
            else:
                logging.info(f"Queue has {queue_size} messages, but EC2 instance {EC2_VECTORIZE_INSTANCE} is already running.")
        
        logging.info(f"Queue has {queue_size} messages, instances has status {instance_status}.")

        logging.info(f"Monitoring instance {EC2_VECTORDB_INSTANCE} for Vector DB liveness.")
        vectordb_instance_status = get_instance_status(EC2_VECTORDB_INSTANCE)

        if vectordb_instance_status != 'running':
            start_ec2_instance(EC2_VECTORDB_INSTANCE)

        # Sleep for the specified interval before checking again
        time.sleep(check_interval)

if __name__ == "__main__":
    # Configure RabbitMQ connection and queue details
    queue_name = RABBITMQ_VECTORIZE_QUEUE  # Replace with your queue name
    check_interval = 10  # Check every 10 seconds (can be adjusted)

    # Start monitoring the queue
    logging.info(f"Starting queue size monitoring service for '{queue_name}' on '{RABBITMQ_VHOST}'")
    monitor_queue(queue_name, check_interval)
