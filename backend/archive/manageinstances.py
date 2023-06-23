import boto3
client = boto3.client('ec2')
# https://boto3.amazonaws.com/v1/documentation/api/latest/guide/quickstart.html#using-boto3
# need to configure your machine w/ above

import sys
from dotenv import load_dotenv
import os

load_dotenv("../../frontend/.env.local")
os.getenv('')

INSTANCE_IDS = [f'{os.getenv("INSTANCE_ID")}']

def start_instance():
    response = client.start_instances(
        InstanceIds = INSTANCE_IDS # list
        # AdditionalInfo='string',
        # DryRun=True|False
    )
    return response

def stop_instance():
    response = client.stop_instances(
        InstanceIds = INSTANCE_IDS # list
        # Hibernate=True|False,
        # DryRun=True|False,
        # Force=True|False
    )
    return response

# eg. python manageinstances.py start_instance
if __name__ == '__main__':
    globals()[sys.argv[1]]()
