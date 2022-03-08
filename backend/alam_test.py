import tasks

query4 = "mom"
tid = 'a1'
print("Calling Query Search Task with Query: {}".format(query4))
res = tasks.querySearch.delay(query_string=query4, teleoscope_id=tid)
print(res.get())
print("Query 4 finished")

query5 = "mom"
tid = 'a2'
print("Calling Query Search Task with Query: {}".format(query5))
res = tasks.querySearch.delay(query_string=query5, teleoscope_id=tid)
print(res.get())
print("Query 5 finished")

query6 = "mom"
tid = 'a1'
print("Calling Query Search Task with Query: {}".format(query6))
res = tasks.querySearch.delay(query_string=query6, teleoscope_id=tid)
print(res.get())
print("Query 6 finished")
=======
from tasks import robj

print("Testing both docs size 2")
res = robj.delay(teleoscope_id='a1', positive_docs=['j1f7am', 'j1f2rk'], negative_docs=['j1f71q', 'j1f36t'], query='mom')
print(res.get())

# print("Testing positive docs size 1, empty negative docs")
# res = robj.delay(teleoscope_id='a1', positive_docs=['j1eznm'], negative_docs=[], query='mom')
# print(res.get())

# print("Testing both size 1")
# res = robj.delay(teleoscope_id='a1', positive_docs=['j1f2rk'], negative_docs=['j1ey3j'], query='mom')
# print(res.get())