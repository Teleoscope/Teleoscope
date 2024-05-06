import os
import yaml
import json

schema_input_directory = "../schemas"
schema_output_directory = "./src/schemas"

# Function to load and validate YAML files, converting them to JSON schema validators
def load_yaml():
    os.makedirs("./src/schemas", exist_ok=True)  # Ensure the directory exists and do not raise an error if it already exists

    for filename in os.listdir(schema_input_directory):
        if filename.endswith(".yaml"):
            filepath = os.path.join(schema_input_directory, filename)
            with open(filepath, 'r') as file:
                schema = yaml.safe_load(file)
                validator = {"$jsonSchema": schema}
                
                # Create JSON file path
                json_filename = filename.replace('.yaml', '.json')
                json_filepath = os.path.join(schema_output_directory, json_filename)
                
                # Write the JSON schema validator to a new file
                with open(json_filepath, 'w') as json_file:
                    json.dump(validator, json_file, indent=4)

# Call the function to perform the operation
if __name__ == "__main__":
    load_yaml()
