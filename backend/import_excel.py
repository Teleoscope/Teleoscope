import pandas as pd
import backend.utils as utils
from tqdm import tqdm
import bson
from pymongo import errors
import argparse
import logging

# Define command-line arguments
parser = argparse.ArgumentParser(description="Update MongoDB documents from an Excel file.")
parser.add_argument("--db", required=True, help="Name of the MongoDB database to connect to")
parser.add_argument("--excel-file", required=True, help="Path to the Excel file")

# Parse command-line arguments
args = parser.parse_args()

# Configure logging
logging.basicConfig(filename='script.log', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

try:
    db = utils.connect(db=args.db)
    df = pd.read_excel(args.excel_file)

    for index, row in tqdm(df.iterrows(), total=df.shape[0]):
        doc = db.documents.find_one({"metadata.source_url": row["source_url"]})
        try:
            db.documents.update_one({"_id": doc["_id"]}, {"$set": {"metadata": row.to_dict()}})
        except errors.WriteError as write_error:
            # Handle the WriteError exception here
            logging.error(f"WriteError: {write_error} for row {row}")
        except errors.ConnectionError as connection_error:
            # Handle the ConnectionError exception here
            logging.error(f"ConnectionError: {connection_error} for row {row}")
except Exception as e:
    # Handle any other unexpected exceptions here
    logging.error(f"An unexpected error occurred: {e}")
