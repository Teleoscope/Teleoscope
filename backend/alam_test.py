from tasks import getEmbedding, getModel


print("Calling get_embedding()...")
result = getEmbedding.delay("Deleted netflix account")
print("Delayed get_embedding(), waiting for return...")
emb = result.get()
print("Task completed.")
print("Embedding Shape: {}".format(emb.shape))