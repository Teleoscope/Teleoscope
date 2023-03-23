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
parser.add_argument('-t', '--text', default="selftext")       # the text field
parser.add_argument('-T', '--title', default="title")         # the title field
parser.add_argument('-r', '--relationships')                  # the relationships field
parser.add_argument('-m', '--metadata')                       # the metadata fields
parser.add_argument('-u', '--uid')                            # a UID field

# True/false option fields
parser.add_argument('-c', '--check',
                    action='store_true')                      # only print the output rather than inserting into MongoDB
parser.add_argument('-v', '--vectorize',
                    action='store_true')                      # vectorize text while putting in MongoDB

parser.add_argument('-e', '--keyerrors',
                    action='store_true')                      # log key errors


class Pushshift:
    def __init__(self, args):
        self.args = args
        self.db = None
        self.complete = []
        self.incomplete = []
        self.db = utils.connect(db=self.args.database)

    def upload(self, obj):
        if self.args.uid != None:
            found = list(self.db.documents.find({"metadata.id": obj[self.args.uid]}))
            if len(found) > 0:
                print(f"document with {obj[self.args.uid]} already in database")
                return
        text = obj[self.args.text]
        title = obj[self.args.title]
        if len(text) == 0 or text == '[removed]' or text == '[deleted]':
            return
        vector = []
        if self.args.vectorize:
            vector = tasks.vectorize_text(text)
        doc = schemas.create_document_object(title, vector, text, metadata=obj)
        try:
            self.db.documents.insert_one(doc)
        except Exception as err:
            print("Insert failed: ", doc, err)
      
    def handle(self, obj):
        if self.args.check:
            print(obj['subreddit'], len(obj['selftext']))
        else:
            self.upload(obj)

    def processfile(self, filename):
        reader = zreader.Zreader(filename, chunk_size=8192)
        # Read each line from the reader
        for line in reader.readlines():
            try:
                obj = json.loads(line)
                if self.args.subreddit != None:
                    if obj["subreddit"] == self.args.subreddit:
                        self.handle(obj)
            except KeyError as err:
                if self.args.keyerrors:
                    print(f"KeyError {err}.")
                pass
            except Exception as err:
                error = f"Unexpected {err=}, {type(err)=} for {filename} and {obj}.\n"
                print(error)
                self.incomplete.append(error)

    def process(self, files):
        outdir = os.path.join(self.args.directory, "done")
        errdir = os.path.join(self.args.directory, "err")

        if not os.path.exists(outdir):
            os.mkdir(outdir)
        
        if not os.path.exists(errdir):
            os.mkdir(errdir)

        for filename in files:
            filepath = os.path.join(self.args.directory, filename)
            print(f'started {filename}.')
            try:
                self.processfile(filepath)
                print(f'finished {filename}.' )
                self.complete.append(filename)
                os.rename(filepath, os.path.join(outdir, filename))
            except UnicodeDecodeError as err:
                os.rename(filepath, os.path.join(errdir, filename))
                pass

            

if __name__ == "__main__":
    # Parse the arguments
    args = parser.parse_args()
    # Get all files (not directories) in given directory
    files = [f for f in listdir(args.directory) if isfile(join(args.directory, f))]
    print(f"Starting to process the following files in {args.directory}:")
    for f in files:
        print(f)
    ps = Pushshift(args)
    ps.process(files)
    # print arguments
    print(args)