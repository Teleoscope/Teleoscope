import argparse
import os
from lxml import etree
import backend.utils as utils
import backend.schemas as schemas
import pymongo
import mmap

def process_element(line, db, title, text):
    try: 
        elem = etree.fromstring(line)
    except Exception as e:
        raise Exception(f"Parsing failed: {line}", e)

    # Process the element here
    doc = {}
   
    try:
        doc = schemas.create_document_object(elem.attrib[title],[],elem.attrib[text],metadata=elem.attrib)
    except KeyError:
        doc = schemas.create_document_object(elem.attrib[text],[],elem.attrib[text],metadata=elem.attrib)
    
    return doc


def read_file_backwards(filename, checkpoint, encoding='utf-8'):
    with open(filename, "r+b") as f:
        with mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ) as mm:
            search_bytes = checkpoint.encode(encoding)
            position = mm.rfind(search_bytes)

            if position != -1:
                # Find the start of the line
                startline = max(mm.rfind(b'\n', 0, position) + 1, 0)
                end = mm.find(b'\n', position)
                endline = end if end != -1 else len(mm)

            # Read the file backwards from the calculated starting point
            while startline >= 0:
                yield mm[startline:endline].decode('utf-8')
                endline = startline - 1
                startline = mm.rfind(b'\n', 0, endline) + 1 if endline != 0 else 0


def chunk_generator(generator, chunk_size):
    """
    Yields chunks of specified size from the generator.
    
    :param generator: An iterable generator.
    :param chunk_size: The size of each chunk.
    """
    chunk = []
    for item in generator:
        chunk.append(item)
        if len(chunk) >= chunk_size:
            yield chunk
            chunk = []
    if chunk:
        yield chunk


def parse_xml(file, tag, checkpoint, database, title, text):
    db = utils.connect(db=database)
    processed = 0

    for chunk in chunk_generator(read_file_backwards(file, checkpoint), 1000):
        processed = [process_element(line, db, title, text) for line in chunk]
        try:
            db.documents.insert_many(processed, ordered=False)
        except pymongo.errors.BulkWriteError as bwe:
            print("Bulk write error occurred:", bwe.details)
            # Handle specific errors (e.g., duplicates, validation errors)
        except Exception as e:
            print("An error occurred:", str(e))
            # Handle other exceptions


def main():
    parser = argparse.ArgumentParser(description="XML Parser for Large Files with Checkpointing")
    parser.add_argument("--file", help="Path to the XML file")
    parser.add_argument("--tag", help="Target tag to process in the XML file")
    parser.add_argument("--db", help="Database to add to.")
    parser.add_argument("--title", help="Name of title field")
    parser.add_argument("--text", help="Name of text field")
    parser.add_argument("--checkpoint", help="Text to start backwards from")
    
    args = parser.parse_args()

    parse_xml(args.file, args.tag, args.checkpoint, args.db, args.title, args.text)

if __name__ == "__main__":
    main()
