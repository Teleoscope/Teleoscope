import boto3
client = boto3.client('ec2')
# https://boto3.amazonaws.com/v1/documentation/api/latest/guide/quickstart.html#using-boto3
# need to configure your machine w/ above

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