import bcrypt, datetime, jwt

import utils

# authenticate user based on provided username and password
# returns true if authenticated, false otherwise
def authUser(username, password):
    db = utils.connect()
    user_obj = db.users.find_one({'username': username})
    return bcrypt.checkpw(password, user_obj['password'])

def issue_token(username):
    payload = {
        "username": username,
        "iat": datetime.datetime.utcnow # the time when the token is issued
        # "eat": # the time when the token is expired
    }

    token = jwt.encode(payload, "secret", algorithm="HS256")
    return token
