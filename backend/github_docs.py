import pickle
import tasks
import schemas
# import required module
import os
# assign directory
directory = 'testdata'
 
# iterate over files in
# that directory
for filename in os.listdir(directory):
    file = os.path.join(directory, filename)
    # checking if it is a file
    if os.path.isfile(file):
        print(f'')
        o = open(file, "rb")
        data = pickle.load(o)
        for d in data:
            title = d.title
            text = d.body
            textVector = tasks.vectorize_text(text)
            doc = schemas.create_document_object(title, text, textVector)
            tasks.add_single_document_to_database(doc)