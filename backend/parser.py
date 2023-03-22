import zreader
import ujson as json
import argparse
import os
import sys
from os import listdir
from os.path import isfile, join
import utils
import tasks
import schemas

parser = argparse.ArgumentParser(
                    prog='Pushshift to MongoDB',
                    description='Takes Pushshift ZST files and puts them into MongoDB.',
                    epilog='Still under construction.')

parser.add_argument('directory')                              # directory to parse
parser.add_argument('-d', '--database', default="teleoscope") # which database to insert into
parser.add_argument('-s', '--subreddit')                      # the subreddit to parse
parser.add_argument('-k', '--chunk-size')                     # how large

# Configuration fields
parser.add_argument('-t', '--text', default="text")           # the text field
parser.add_argument('-T', '--title', default="title")         # the title field
parser.add_argument('-r', '--relationships')                  # the relationships field
parser.add_argument('-m', '--metadata')                       # the metadata fields

# True/false option fields
parser.add_argument('-c', '--check',
                    action='store_true')                      # only print the output rather than inserting into MongoDB
parser.add_argument('-v', '--vectorize',
                    action='store_true')                      # vectorize text while putting in MongoDB


class Pushshift:
    def __init__(self):
        self.db = None
        self.complete = []
        self.incomplete = []
        self.db = utils.connect(db=args.database)

    def upload(self, obj, args):
        text = obj[args.text]
        title = obj[args.title]
        print("here")

        vector = tasks.vectorize_text(text)
        print("here")
        doc = schemas.create_document_object(title, vector, text, metadata=obj)
        self.db.documents.insert_one(doc)
        
    def handle(self, obj, args):
        if args.check:
            print(obj['subreddit'])
        else:
            print("here")
            self.upload(obj, args)

    def processfile(self, filename, args):
        reader = zreader.Zreader(filename, chunk_size=8192)
        # Read each line from the reader
        for line in reader.readlines():
            try:
                obj = json.loads(line)
                if args.subreddit != None:
                    if obj["subreddit"] == args.subreddit:
                        self.handle(obj, args)
            except KeyError:
                pass
                # print("Document has no subreddit field.")
            except Exception as err:
                error = f"Unexpected {err=}, {type(err)=} for {filename} and {obj}.\n"
                print(error)
                self.incomplete.append(error)

    def process(self, files, args):
        for filename in files:
            self.processfile(filename, args)
            self.complete.append(filename)

if __name__ == "__main__":
    # Parse the arguments
    args = parser.parse_args()
    # Get all files (not directories) in given directory
    files = [
        join(args.directory, f) 
        for f in listdir(args.directory) 
        if isfile(join(args.directory, f))
    ]
    ps = Pushshift()
    try:
        ps.process(files, args)
    except KeyboardInterrupt:
        print('Interrupted')
        try:
            print("Complete --------------------------------------------------")
            print(ps.complete)
            print("Incomplete ------------------------------------------------")
            print(ps.incomplete)
            print("Arguments -------------------------------------------------")
            print(args)
            sys.exit(130)
        except SystemExit:
            os._exit(130)
    # print arguments
    print(args)