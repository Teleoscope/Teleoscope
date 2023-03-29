# authenticate.py
# helper function for auth_server.py

import bcrypt, datetime, jwt, logging

import utils

# register the user based on provided first name, last name, username and password
# returns -2 if any exception is raised
# returns 0 if user already exists in the database
# returns 1 if user is registered
def registerUser(firstName, lastName, username, password, salt):
    try:
        transaction_session, db = utils.create_transaction_session()
        if db.users.count_documents({ 'username': username }):
            return 0
        
        #creating document to be inserted into mongoDB
        obj = {
            "creation_time": datetime.datetime.utcnow(),
            "password": password,
            "username": username,
            "salt": salt,
            "sessions":[],
            "action": "initialize a user"
        }

        with transaction_session.start_transaction():
            users_res = db.users.insert_one(obj, session=transaction_session)
            logging.info(f"Added user {username} with result {users_res}.")
            utils.commit_with_retry(transaction_session)

        return 1
    except:
        return -2

# authenticate user based on provided username and password
# returns -2 if any exception is raised
# returns -1 if user is not found in database
# returns 0 if user's password is incorrect
# returns 1 if user is authenticated
def authUser(username, password):
    try:
        db = utils.connect()
        user_obj = db.users.find_one({'username': username})
        if user_obj is None:
            return -1
        
        return password == user_obj['password']
    except:
        return -2

# create a JWT based on provided secret and username
# returns a JWT
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

# generates a random salt
# used for user registration
# returns a random salt
def get_rand_salt():
    return bcrypt.gensalt()

# gets the salt that is corresponding to the username
# used for user login
# returns -2 if any exception is raised
# returns -1 if user is not found in database
def get_salt(username):
    try:
        db = utils.connect()
        user_obj = db.users.find_one({'username': username})
        if user_obj is None:
            return -1
        return user_obj['salt']
    except:
        return -2
