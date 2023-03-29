import boto3
client = boto3.client('ec2')

INSTANCE_IDS = []

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