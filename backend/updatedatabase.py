import utils

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
    db.session.update_one(
        {
            "_id": session["_id"]
        }, 
        {
            "$set": {
                "userlist" : new_ul
            }
        }
    )



    