import os
import yaml
import json

schema_input_directory = "../schemas"
schema_output_directory = "./src/schemas"
type_output_directory = "./src/types"

# Helper function to convert JSON schema to TypeScript interface
def json_schema_to_typescript(schema, interface_name: str):
    def parse_property(prop_name, prop):
        ts_type = "any"
        if 'bsonType' in prop:
            if prop['bsonType'] == 'objectId':
                ts_type = 'ObjectId'
            if prop['bsonType'] == 'string':
                ts_type = 'string'
            elif prop['bsonType'] == 'number':
                ts_type = 'number'
            elif prop['bsonType'] == 'int':
                ts_type = 'number'
            elif prop['bsonType'] == 'bool':
                ts_type = 'boolean'
            elif prop['bsonType'] == 'date':
                ts_type = 'Date'
            elif prop['bsonType'] == 'array' and 'items' in prop:
                items_type = parse_property(prop_name[0:-1], prop['items'])
                ts_type = f'Array<{items_type}>'
            elif prop['bsonType'] == 'object' and 'properties' in prop:
                nested_interface = json_schema_to_typescript(prop, f'{prop_name}'.title())
                nested_interface_code.append(nested_interface)
                ts_type = f'{prop_name}'.title()
        return ts_type

    interface_code = f'interface {interface_name.title()} {{\n'
    nested_interface_code = []
    for prop_name, prop in schema.get('properties', {}).items():
        ts_type = parse_property(prop_name, prop)
        if 'required' in schema and prop_name in schema['required']:
            interface_code += f'  {prop_name}: {ts_type};\n'
        else:
            interface_code += f'  {prop_name}?: {ts_type};\n'
    interface_code += '}\n\n'
    return interface_code + '\n'.join(nested_interface_code)



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

                # Generate TypeScript interface
                interface_name = filename.replace('.yaml', '')
                typescript_interface = json_schema_to_typescript(schema, interface_name)
                typescript_file_header = 'import { ObjectId } from "mongodb";\n\nexport '
                typescript_output = typescript_file_header + typescript_interface

                
                # Create TypeScript file path
                ts_filename = filename.replace('.yaml', '.ts')
                ts_filepath = os.path.join(type_output_directory, ts_filename)
                
                # Write the TypeScript interface to a new file
                with open(ts_filepath, 'w') as ts_file:
                    ts_file.write(typescript_output)

                

# Call the function to perform the operation
if __name__ == "__main__":
    load_yaml()
