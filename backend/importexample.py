import utils
import vectorize_tasks
import resource

db = utils.connect(db="nursing")


def get_memory_usage():
    rusage = resource.getrusage(resource.RUSAGE_SELF)
    return rusage.ru_idrss + rusage.ru_isrss  # Virtual memory usage in kilobytes

def runpipe(size):
  filter = {
  "textVector": {
   "$size": 0
  }
 }
  pipeline = [ {"$match": filter}, {"$sample": {"size": size}}]
  result = list(db.documents.aggregate(pipeline))
  for doc in result:
    if len(doc["textVector"]) == 0:
      vectorize_tasks.vectorize_and_upload_text(doc["text"],"nursing",doc["_id"])

for i in range(0, 25):
  mem_before = get_memory_usage()
  runpipe(10)
  mem_after = get_memory_usage()
  print(f"Virtual memory usage increased by {mem_after - mem_before} KB")