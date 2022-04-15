import logging,utils
from warnings import simplefilter
from celery import Task
from Reorient import Reorient
from App import app

# ignore all future warnings
simplefilter(action='ignore', category=FutureWarning)

'''
querySearch:
Performs a text query on aita.clean.posts.v2 text index.
If the query string alredy exists in the queries collection, returns existing reddit_ids.
Otherwise, adds the query to the queries collection and performs a text query the results of which are added to the
queries collection and returned.
TODO: 
1. We can use GridFS to store the results of the query if needed (if sizeof(reddit_ids) > 16MB).
   Doesnt seem to be an issue right now.
2. Checks for both teleoscope_id and query. Need confirmation from frontend on whether the teleoscope_id and/or query will already exist?
   If not, then who updates them?
'''
@app.task
def querySearch(query_string, teleoscope_id):
    db = utils.connect()
    query_results = db.queries.find_one({"query": query_string, "teleoscope_id": teleoscope_id})
    
    if query_string == "":
        logging.info(f"query {query_string} is empty.")
        return []

    # # check if query already exists
    # if query_results is not None:
    #     logging.info(f"query {query_string} already exists in queries collection")
    #     return query_results['reddit_ids']

    # create a new query document
    db.queries.insert_one({
        "query": query_string, 
        "teleoscope_id": teleoscope_id,
        "rank_slice": []
        }

    )

    # perform text search query
    textSearchQuery = {"$text": {"$search": query_string}}
    cursor = db.clean.posts.v2.find(textSearchQuery, projection = {'id':1})
    return_ids = [x['id'] for x in cursor]

    # store results in queries collection
    db.queries.update_one({'query': query_string, 'teleoscope_id': teleoscope_id}, {'$set': {'reddit_ids': return_ids}})
    
    logging.info(f"query {query_string} added to queries collection")
    return return_ids


# Register the reorient task to the Celery app
reorientTaskObject = app.register_task(Reorient())
