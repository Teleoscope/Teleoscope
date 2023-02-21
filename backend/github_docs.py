import pickle
import tasks
import schemas
import json
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
            title = str(d.title)
            text = str(d.body)
            textVector = tasks.vectorize_text(text)
            meta = {
                "comments": d.comments,
                "id": d.id,
                "number": d.number,
                "state": d.state,
                "locked": d.locked,
                "active_lock_reason": d.active_lock_reason,
                "user": d.user.login
            }
            if "created_at" in d:
                meta["created_at"] = d.created_at.isoformat()
            if "updated_at" in d:
                meta["updated_at"] = d.updated_at.isoformat()
            if "closed_at" in d:
                meta["closed_at"] = d.closed_at.isoformat()
            if "assignee" in d:
                meta["assignee"] = d.assignee.login
            if "closed_by" in d:
                meta["closed_by"] = d.closed_by.login
            if "assignees" in d:
                meta["assignees"] = [a.login for a in d.assignees]
         

            doc = schemas.create_document_object(title, text, textVector, meta=meta)
            tasks.add_single_document_to_database(doc)