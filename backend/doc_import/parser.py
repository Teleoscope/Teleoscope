import zreader
import ujson as json
import argparse
from os import listdir
from os.path import isfile, join

parser = argparse.ArgumentParser(
                    prog='Pushshift to MongoDB',
                    description='Takes Pushshift ZST files and puts them into MongoDB.',
                    epilog='Still under construction.')

parser.add_argument('directory')          # directory to parse
parser.add_argument('-d', '--database')   # which database to insert into
parser.add_argument('-s', '--subreddit')  # the subreddit to parse
parser.add_argument('-k', '--chunk-size') # how large
parser.add_argument('-c', '--check',
                    action='store_true')  # only print the output rather than inserting into MongoDB

# Read each line from the reader
# for line in reader.readlines():
    # obj = json.loads(line)

def processfile(file, args):
    reader = zreader.Zreader(file, chunk_size=8192)
    # Read each line from the reader
    for line in reader.readlines():
        obj = json.loads(line)
        if args.check:
            print(obj)
            continue

def process(files, args):
    for file in files:
        processfile(file, args)

if __name__ == "__main__":
    # Parse the arguments
    args = parser.parse_args()
    # Get all files (not directories) in given directory
    files = [
        join(args.directory, f) 
        for f in listdir(args.directory) 
        if isfile(join(args.directory, f))
    ]
    process(files, args)

    # print arguments
    print(args)