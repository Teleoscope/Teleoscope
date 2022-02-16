import tasks


# print("Calling get_embedding()...")
# result = getEmbedding.delay("Deleted netflix account")
# print("Delayed get_embedding(), waiting for return...")
# emb = result.get()
# print("Task completed.")
# print("Embedding Shape: {}".format(emb.shape))

print("Calling NLP Task...")
tasks.nlp(query_string="password", post_id="d6i6s9", status=1)





