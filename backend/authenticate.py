# authenticate.py
# helper function for auth_server.py

import bcrypt, datetime, jwt

import utils
from tasks import register_account

# register the user based on provided first name, last name, username and password
# returns -1 if any exception is raised
# returns 0 if user already exists in the database
# returns 1 if user is registered
def registerUser(firstName, lastName, username, password):
    try:
        db = utils.connect()
        if db.users.count_documents({ 'username': username }):
            return 0
        
        register_account(firstName=firstName, lastName=lastName, username=username, password=password)
        return 1
    except:
        return -1

# authenticate user based on provided username and password
# returns -1 if user is not found in database
# returns 0 if user's password is incorrect
# returns 1 if user is authenticated
def authUser(username, password):
    # TODO: rewrite this function to support new way of checking password
    # TODO: add try except block to preven database error
    db = utils.connect()
    user_obj = db.users.find_one({'username': username})
    if user_obj is None:
        return -1
    return bcrypt.checkpw(password.encode('utf-8'), user_obj['password'].encode('utf-8'))

def issue_token(secret, username):
    curr_time = datetime.datetime.utcnow()
    # the time are converted into iso format, which is generic in both python and javascript
    payload = {
        'username': username,
        # the time when the token is issued
        'iat': curr_time.isoformat(),
        # the time when the token is expired, expired after one day
        'eat': (curr_time + datetime.timedelta(days=1)).isoformat()
    }

    token = jwt.encode(payload, secret, algorithm='HS256')
    return token
