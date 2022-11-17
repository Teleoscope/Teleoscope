import utils

db = utils.connect()

users = list(db.users.find({}))
userids = {}
for user in users:
    userids[user["username"]] = user["_id"]

## Array update template
# db.collection.updateOne(
#    { <query conditions> },
#    { <update operator>: { "<array>.$[]" : value } }
# )

sessions = db.sessions.find({})
for session in sessions:
    history = session["history"]
    for h in history:
        if "user" in h:
            print(type(h["user"]))
            if "user"[0:7] == "ObjectId":
                pass
            else:
                h["user"] = userids[h["user"]]
        else:
            h["user"] = userids["paul"]
    print(history)
    '''uncommment below to actually update
    db.sessions.update_one(
        {
            "_id": session["_id"]
        }, 
        {
            "$set": {
                "history" : history
            }
        }
    )
    '''



# Already ran, don't run again
def updateSessionSchema():
    return # although comment this out if you want to
    db = utils.connect()

    users = list(db.users.find({}))
    userids = {}
    for user in users:
        userids[user["username"]] = user["_id"]
    sessions = db.sessions.find({})

    for session in sessions:
        curr_ul = session["userlist"]
        new_ul = {
            "owner" : "",
            "collaborators": []  
        }
        for user in curr_ul.keys():
            if curr_ul[user] == "owner":
                new_ul["owner"] = userids[user]
            if curr_ul[user] == "collaborator":
                new_ul["collaborators"].append(userids[user])
        
        print(new_ul)
        '''uncomment below to actually update
        db.sessions.update_one(
            {
                "_id": session["_id"]
            }, 
            {
                "$set": {
                    "userlist" : new_ul
                }
            }
        )
        '''



    