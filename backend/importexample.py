import utils
import vectorize_tasks
import resource
import argparse



parser = argparse.ArgumentParser(
                    prog='Vectorizer',
                    description='Create text vectors for a random sample of texts.',
                    epilog='Still under construction.')

parser.add_argument('-c', '--collection')                       # collection to vectorize
parser.add_argument('-d', '--database', default="teleoscope")   # databse to vectorize

# Configuration fields
parser.add_argument('-t', '--text', default="text")             # the text field
parser.add_argument('-s', '--samples', default=100, type=int)   # sample size per iteration
parser.add_argument('-i', '--iterations', default=10, type=int) # number of iterations


def get_memory_usage():
    rusage = resource.getrusage(resource.RUSAGE_SELF)
    return rusage.ru_idrss + rusage.ru_isrss  # Virtual memory usage in kilobytes

def runpipe(size, database):
  db = utils.connect(db=database)
  filter = {
  "textVector": {
   "$size": 0
  }
 }
  pipeline = [ {"$match": filter}, {"$sample": {"size": size}}]
  result = list(db.documents.aggregate(pipeline))
  for doc in result:
    if len(doc["textVector"]) == 0:
      vectorize_tasks.vectorize_and_upload_text(doc["text"], database, doc["_id"])

if __name__ == "__main__":
  # Parse the arguments
  args = parser.parse_args()
  for i in range(0, args.iterations):
    runpipe(args.samples, args.database)
