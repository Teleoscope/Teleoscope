from flask import Flask, request, make_response

from authenticate import *

app = Flask(__name__)

@app.route("/login", methods=['GET'])
def hello_world():
    if request.method == 'GET':
        username = request.form['username']
        password = request.form['password']
        auth_value = authUser(username, password)
        if auth_value == -1:
            return make_response('Incorrect username', 401)
        elif auth_value == 0:
            return make_response('Incorrect password', 403)
        else:
            token = issue_token(username)
            return make_response('User authenticated', 200, {'token': token})
