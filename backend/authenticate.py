import bcrypt, datetime, jwt

import utils
import logging
# from tasks import initialize_session

def registerUser(firstName, lastName, username, password):
    transaction_session, db = utils.create_transaction_session()
    
    if db.users.count_documents({ 'username': username }):
        return False

    #creating document to be inserted into mongoDB
    obj = {
        "creation_time": datetime.datetime.utcnow(),
        "password": password,
        "username": username,
        "sessions":[],
        "action": "initialize a user"
    }

    with transaction_session.start_transaction():
        users_res = db.users.insert_one(obj, session=transaction_session)
        logging.info(f"Added user {username} with result {users_res}.")
        utils.commit_with_retry(transaction_session)

    user = db.users.find_one({"username": username})

    # consider using Stomp.ts -> rabbitmq -> celery pipeline 
    # after auth_server returns a successful message
    # initialize_session(userid=user["_id"], label="default", color="#e76029")
    
    return True

# authenticate user based on provided username and password
# returns -1 if user is not found in database
# returns 0 if user's password is incorrect
# returns 1 if user is authenticated
def authUser(username, password):
    db = utils.connect() # ASK: will this make multiple connections to db and cause problem
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
