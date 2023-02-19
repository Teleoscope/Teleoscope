from flask import Flask
from flask import request

from authenticate import *

app = Flask(__name__)

@app.route("/authenticate", method=['GET'])
def hello_world():
    if request.method == 'GET':
        username = request.form['username']
        password = request.form['password']
        if authUser(username, password):
            token = issue_token(username)
            # construct a response to send back token