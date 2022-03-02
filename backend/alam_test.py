import tasks


# print("Calling get_embedding()...")
# result = getEmbedding.delay("Deleted netflix account")
# print("Delayed get_embedding(), waiting for return...")
# emb = result.get()
# print("Task completed.")
# print("Embedding Shape: {}".format(emb.shape))

print("Testing both docs size 2")
res = tasks.reorient.delay(teleoscope_id='a1', positive_docs=['j1f7am', 'j1f2rk'], negative_docs=['j1f71q', 'j1f36t'], query='mom')
print(res.get())

print("Testing positive docs size 1, empty negative docs")
res = tasks.reorient.delay(teleoscope_id='a1', positive_docs=['j1eznm'], negative_docs=[], query='mom')
print(res.get())

print("Testing both size 1")
res = tasks.reorient.delay(teleoscope_id='a1', positive_docs=['j1f2rk'], negative_docs=['j1ey3j'], query='mom')
print(res.get())





