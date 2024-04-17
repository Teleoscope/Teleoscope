import os
from dotenv import load_dotenv
load_dotenv

schema_directory = "./schemas"

# Test for making sure that the schemas are well-formatted
def test_load_yaml():
    for filename in os.listdir(schema_directory):
        import yaml
        if filename.endswith(".yaml"):
            filepath = os.path.join(schema_directory, filename)
            with open(filepath, 'r') as file:
                schema = yaml.safe_load(file)
                print(f"Data from {schema}:")


# Test for creating the schema in Atlas
def test_create_MongoDB_schema():
    from pymongo.mongo_client import MongoClient
    from pymongo.server_api import ServerApi

    uri = "mongodb+srv://paul:BhV8DmMFxx9E6zxg@teleoscopetesting.ubza1fk.mongodb.net/?retryWrites=true&w=majority&appName=TeleoscopeTesting"

    # Create a new client and connect to the server
    client = MongoClient(uri, server_api=ServerApi('1'))
    
    # Send a ping to confirm a successful connection
    try:
        client.admin.command('ping')
        print("Pinged your deployment. You successfully connected to MongoDB!")
    except Exception as e:
        raise e

    # Drop any previous database called test
    try: 
        client.drop_database("test")
    except Exception as e:
        print(e)

    # should be a clean database now
    db = client["test"]
    
    # test each schema
    for filename in os.listdir(schema_directory):
        import yaml
        if filename.endswith(".yaml"):
            filepath = os.path.join(schema_directory, filename)
            with open(filepath, 'r') as file:
                schema = yaml.safe_load(file)
                print(f"Data from {schema}:")

                db.create_collection(
                    filename,
                    validator={
                        "$jsonSchema": schema
                    }
                )
