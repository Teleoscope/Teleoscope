import tasks


# print("Calling get_embedding()...")
# result = getEmbedding.delay("Deleted netflix account")
# print("Delayed get_embedding(), waiting for return...")
# emb = result.get()
# print("Task completed.")
# print("Embedding Shape: {}".format(emb.shape))

# def nlp(*args, query_string: str, post_id: str, status: int):
#     db = connect()
#     model = loadModel() # load NLP model
#     qvector = model([query_string]).numpy() # convert query string to vector
#     feedbackVector = getPostVector(db, post_id) # get vector of feedback post
#     qprime = moveVector(sourceVector=qvector, destinationVector=feedbackVector, direction=status) # move qvector towards/away from feedbackVector
#     allPosts = getAllPosts(db, projection={'id':1, 'selftextVector':1}) # get all Posts from mongoDB as a list of projection tuples
#     scores = calculateSimilarity(posts=allPosts, queryVector=qprime) # calculate similarity scores for all posts
#     newRanks = rankPostsBySimilarity(allPosts, scores)
#     db.queries.update_one({'query':query_string}, {'$set': { "ranked_post_ids" : newRanks}}) # update query with new ranked post ids
#     print(f"NLP: {query_string}, {post_id}, {status}")
#     return 200

query = "password"
query_in_db = False

qvector = None
if not query_in_db:
    print('1. Getting embedding for query...')
    qvector = tasks.getEmbedding.delay(query).get()
    print('2. Received embedding for query.')



