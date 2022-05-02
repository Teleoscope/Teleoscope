import os
from os.path import dirname, realpath


# Set the environment variable for the application
# This is required so that subfolders can be imported and can import parent folders
curr_file_path = dirname(realpath(__file__))
parent_path = dirname(curr_file_path)
print(parent_path)
os.environ["PYTHONPATH"] = parent_path

from App.Tasks import tasks

# initial query - mdb find 
query4 = "university"
tid = 'a34'
print("Calling Query Search Task with Query: {}".format(query4))
res = tasks.querySearch.delay(query_string=query4, teleoscope_id=tid)
res = res.get()
print("MDBSearch task complete with query {}".format(query4))

res = tasks.reorient.delay(teleoscope_id=tid, positive_docs=['j1f7am', 'j1f2rk'], negative_docs=['j1f71q', 'j1f36t'], query=query4)
print(res.get())

# print("Testing positive docs size 1, empty negative docs")
# res = robj.delay(teleoscope_id='a1', positive_docs=['j1eznm'], negative_docs=[], query='mom')
# print(res.get())

# print("Testing both size 1")
# res = robj.delay(teleoscope_id='a1', positive_docs=['j1f2rk'], negative_docs=['j1ey3j'], query='mom')
# print(res.get())