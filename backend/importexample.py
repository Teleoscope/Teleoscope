import utils
import vectorize_tasks
db = utils.connect(db="nursing")

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

for i in range(0, 100):
  runpipe(10)