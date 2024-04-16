import os

schema_directory = "./schemas"

def test_load_yaml():
    for filename in os.listdir(schema_directory):
        import yaml
        if filename.endswith(".yaml"):
            filepath = os.path.join(schema_directory, filename)
            with open(filepath, 'r') as file:
                schema = yaml.safe_load(file)
                print(f"Data from {schema}:")