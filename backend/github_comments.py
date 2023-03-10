import pickle
import tasks
import schemas
import json
import os
import utils
import sys

print(f"Name of the script      : {sys.argv[0]=}")
print(f"Arguments of the script : {sys.argv[1:]=}")

if len(sys.argv[1:]) == 0:
    print(f"Need directory to run script, e.g.\n\tpython {sys.argv[0]} <dirname>")
else:
    directory = sys.argv[1]

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
            print(f'{file} has {len(data)} issues.')
            acc = 0
            next = 0
            dontskip = True
            for d in data:
                print(f'Processing Issue {d.id} from {file}...')
                acc = acc + 1
                #####################################################
                # if acc >= next and dontskip:
                #     i = input()
                #     if i == "":
                #         next = acc + 1
                #     elif i == "all":
                #         dontskip = False
                #     else:
                #         next = acc + int(i)
                #     print(f"current: {acc}; next: {next}; i: {i}")
                #####################################################
                check = list(db.documents.find({"metadata.id": d.id}))
                if len(check) > 0:
                    print("Already in DB...")
                    continue
                title = "Comment"
                text = str(d.body)
                textVector = tasks.vectorize_text(text)
                meta = {
                    "id": d.id,
                    "user": d.user.login
                }
                if "url" in vars(d) and d.url != None:
                    meta["url"] = d.url
                if "issue_url" in vars(d) and d.issue_url != None:
                    meta["issue_url"] = d.issue_url
                if "html_url" in vars(d) and d.html_url != None:
                    meta["html_url"] = d.html_url            
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
            

                doc = schemas.create_document_object(title, text, textVector, metadata=meta)
                tasks.add_single_document_to_database(doc)