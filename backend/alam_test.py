import tasks

query = "password"
print("Calling Query Search Task with Query: {}".format(query))
res = tasks.querySearch.delay(query_string="password")
print(res.get())
