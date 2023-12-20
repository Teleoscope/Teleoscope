import chromadb
from . import utils
import argparse
from pymongo import MongoClient

def main():
    parser = argparse.ArgumentParser(description="ChromaDB init from MongoDB")
    parser.add_argument("--db", help="The database to import documents from.")
    parser.add_argument("--datapath", help="Where to persist the vector DB.")
    
    
    args = parser.parse_args()

    importdb(args.db, args.datapath)


def importdb(database, datapath):
    client = chromadb.PersistentClient(path=datapath)
    
    collection = client.get_or_create_collection(database)
    
    db = utils.connect(db=database)
    
    # Set batch size
    batch_size = 10000

    # Initialize the processed count
    processed_count = 0

    while True:
        # Retrieve a batch of documents
        batch_cursor = db.documents.find().skip(processed_count).limit(batch_size)
        batch = list(batch_cursor)

        # Break if no more documents are available
        if not batch:
            break

        documents = []
        metadatas = []
        ids = []
        # Process each document in the batch
        for document in batch:
            documents.append(document["text"])
            metadatas.append({"title": document["title"]})
            ids.append(str(document["_id"]))

        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )

        # Update the count of processed documents
        processed_count += len(batch)

    # Close the client connection
    client.close()

if __name__ == "__main__":
    main()
