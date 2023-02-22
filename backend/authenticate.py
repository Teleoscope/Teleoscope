import bcrypt, datetime, jwt

import utils

# authenticate user based on provided username and password
# returns -1 if user is not found in database
# returns 0 if user's password is incorrect
# returns 1 if user is authenticated
def authUser(username, password):
    db = utils.connect()
    user_obj = db.users.find_one({'username': username})
    if user_obj is None:
        return -1
    return bcrypt.checkpw(password.encode('utf-8'), user_obj['password'].encode('utf-8'))

def issue_token(username):
    curr_time = datetime.datetime.utcnow()
    # the time are converted into iso format, which is generic in both python and javascript
    payload = {
        'username': username,
        # the time when the token is issued
        'iat': curr_time.isoformat(),
        # the time when the token is expired, expired after one day
        'eat': (curr_time + datetime.timedelta(days=1)).isoformat()
    }

    token = jwt.encode(payload, 'secret', algorithm='HS256')
    return token
