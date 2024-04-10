import json
import backend.utils as utils
from tqdm import tqdm
from pymongo import errors, TEXT as p
import argparse
import logging
from . import tasks

# Define command-line arguments
# parser = argparse.ArgumentParser(description="Update MongoDB documents from JSON files.")
# parser.add_argument("--db", required=True, help="Name of the MongoDB database to connect to")
# parser.add_argument("--json-file", required=True, help="Path to the JSON file")

# Parse command-line arguments
# args = parser.parse_args()

# Configure logging
logging.basicConfig(filename='script.log', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def github_issue_doc_parser(doc):
    """
    Parse a GitHub issue document into a dictionary.
    """
    return {
        "title": doc["title"],
        "text": doc["body"],
        "id": doc["id"],
        "url": doc["url"],
        "metadata": {
            "source": "GitHub",
            "labels": doc["labels"],
            "state": doc["state"],
            'references': doc['references'],
        },
         'state': {
            'read': False
        },
          'textVector': tasks.vectorize_text(doc["body"])

    }
    
try:
    
    db = utils.connect(db="calcom_calcom_issues")
    
    # if has documents, drop the collection
    if db.documents.count_documents({}) > 0:
        db.documents.drop()
    
    # Create index on text and id and title
    db.documents.create_index([("text", p), ("id", p), ("title", p)])
  
    with open("calcom_cal.com_issues.json") as f:
        data = json.load(f)
        for issue in tqdm(data):
            parsed_issue = github_issue_doc_parser(issue)
            db.documents.replace_one({"id": parsed_issue["id"]}, parsed_issue, upsert=True)
except Exception as e:
    print(f"An unexpected error occurred: {e}")
    logging.error(f"An unexpected error occurred: {e}")
    
