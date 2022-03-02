import tasks

# query1= "password"
# print("Calling Query Search Task with Query: {}".format(query1))
# res = tasks.querySearch.delay(query_string=query1)
# print(res.get())
# print("Query 1 finished")

# query2= "bike"
# print("Calling Query Search Task with Query: {}".format(query2))
# res = tasks.querySearch.delay(query_string=query2)
# print(res.get())
# print("Query 2 finished")

# approx 400k docs
query3 = "aita"
print("Calling Query Search Task with Query: {}".format(query3))
res = tasks.querySearch.delay(query_string=query3)
print(res.get())
print("Query 3 finished")