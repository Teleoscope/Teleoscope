import pickle
import tasks
import schemas
import json
import os
import utils
# assign directory
directory = 'testdata'

# iterate over files in
# that directory
for filename in os.listdir(directory):
    db = utils.connect()
    file = os.path.join(directory, filename)
    # checking if it is a file
    if os.path.isfile(file):
        print(f'Processing {file}...')
        o = open(file, "rb")
        data = pickle.load(o)
        acc = 0
        next = 0
        for d in data:
            print(f'Processing Issue {d.id}...')
            acc = acc + 1
            if acc >= next:
                i = input()
                if i == "":
                    next = acc + 1
                else:
                    next = acc + int(i)
                print(f"current: {acc}; next: {next}; i: {i}")
            check = list(db.documents.find({"meta.id": d.id}))
            if len(check) > 0:
                print("Already in DB...")
                continue
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
            if "created_at" in vars(d) and d.created_at != None:
                meta["created_at"] = d.created_at.isoformat()
            if "updated_at" in vars(d) and d.updated_at != None:
                meta["updated_at"] = d.updated_at.isoformat()
            if "closed_at" in vars(d) and d.closed_at != None:
                meta["closed_at"] = d.closed_at.isoformat()
            if "assignee" in vars(d) and d.assignee != None:
                meta["assignee"] = d.assignee.login
            if "closed_by" in vars(d) and d.closed_by != None:
                meta["closed_by"] = d.closed_by.login
            if "assignees" in vars(d) and d.assignees != None:
                meta["assignees"] = [a.login for a in d.assignees]
         

            doc = schemas.create_document_object(title, text, textVector, meta=meta)
            tasks.add_single_document_to_database(doc)