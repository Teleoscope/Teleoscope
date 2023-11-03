from . import utils
from . import tasks
import resource
import argparse

parser = argparse.ArgumentParser(
                    prog='Vectorizer',
                    description='Create text vectors for a random sample of texts.',
                    epilog='Still under construction.')

parser.add_argument('-c', '--collection', default="documents")                       # collection to vectorize
parser.add_argument('-d', '--database', required=True)        # databse to vectorize

# Configuration fields
parser.add_argument('-t', '--text', default="text")             # the text field
parser.add_argument('-s', '--samples', default=100, type=int)   # sample size per iteration
parser.add_argument('-i', '--iterations', default=10, type=int) # number of iterations


def get_memory_usage():
    rusage = resource.getrusage(resource.RUSAGE_SELF)
    return rusage.ru_idrss + rusage.ru_isrss  # Virtual memory usage in kilobytes


def runpipe(size, database):
  db = utils.connect(db=database)
  filter = filter = {
  "$or": [
    { "textVector": { "$size": 0 } },
    { "textVector": { "$exists": False } }
  ]
}
  pipeline = [ {"$match": filter}, {"$sample": {"size": size}}]
  result = list(db.documents.aggregate(pipeline))
  print(f"Checking {len(result)} docs...")
  for doc in result:
    if "textVector" not in doc:
      tasks.vectorize_and_upload_text(doc["text"], database, doc["_id"])
    elif len(doc["textVector"]) == 0:
      tasks.vectorize_and_upload_text(doc["text"], database, doc["_id"])


if __name__ == "__main__":
  # Parse the arguments
  args = parser.parse_args()
  print(f"Staring to run for {args}")
  for i in range(0, args.iterations):
    runpipe(args.samples, args.database)