import argparse
import os
from lxml import etree
import backend.utils as utils
import backend.schemas as schemas
import pymongo
import mmap

def process_element(elem, db, title, text):
    # Process the element here
    doc = {}
   
    try:
        doc = schemas.create_document_object(elem.attrib[title],[],elem.attrib[text],metadata=elem.attrib)
    except KeyError:
        doc = schemas.create_document_object(elem.attrib[text],[],elem.attrib[text],metadata=elem.attrib)
    
    try:
        db.documents.insert_one(doc)
    except pymongo.errors.DuplicateKeyError:
        print(f"Already in database: {elem.attrib}")
        pass

    # Clear processed elements to save memory
    elem.clear()
    while elem.getprevious() is not None:
        del elem.getparent()[0]



def read_file_backwards(filename):
    with open(filename, "r+b") as f:
        with mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ) as mm:
            endline = mm.rfind(b'\n', 0, mm.size())  # Find the last newline
            startline = mm.rfind(b'\n', 0, endline) + 1 if endline != 0 else 0
            while startline >= 0:
                yield mm[startline:endline].decode('utf-8')
                endline = startline - 1  # Move to the previous line
                startline = mm.rfind(b'\n', 0, endline) + 1 if endline != 0 else 0


def parse_xml(file, tag, checkpoint, database, title, text):
    db = utils.connect(db=database)
    last_processed = 0
    if os.path.exists(checkpoint):
        with open(checkpoint, 'r') as f:
            content = f.read().strip()
            if content.isdigit():
                last_processed = int(content)
            else:
                print("Checkpoint file contains invalid data. Starting from the beginning.")

    # Usage example
    for line in read_file_backwards(file):
        
        elem = etree.fromstring(line)
        
        print(f"Element: {elem.tag}, Attributes: {elem.attrib}, Event: {event}")
            # if processed >= last_processed:
        #         process_element(elem, db, title, text)
        #         last_processed = processed
        #         with open(checkpoint, 'w') as f:
        #             f.write(str(processed))
        #     processed += 1
        # del context




def main():
    parser = argparse.ArgumentParser(description="XML Parser for Large Files with Checkpointing")
    parser.add_argument("--file", help="Path to the XML file")
    parser.add_argument("--tag", help="Target tag to process in the XML file")
    parser.add_argument("--db", help="Database to add to.")
    parser.add_argument("--title", help="Name of title field")
    parser.add_argument("--text", help="Name of text field")
    parser.add_argument("--checkpoint", default="checkpoint.txt", help="Checkpoint file name")
    
    args = parser.parse_args()

    parse_xml(args.file, args.tag, args.checkpoint, args.db, args.title, args.text)

if __name__ == "__main__":
    main()
