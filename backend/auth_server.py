from flask import Flask, request, make_response, jsonify
from flask_cors import CORS

from authenticate import *

app = Flask(__name__)
CORS(app)

@app.route("/register", methods=['POST'])
def register():
    if request.method == 'POST':
        request_body = request.get_json()
        firstName = request_body['firstName']
        lastName = request_body['lastName']
        username = request_body['username']
        password = request_body['password']
        if registerUser(firstName, lastName, username, password):
            response = make_response(jsonify('Successfully registered.', 201))
        else :
            response = make_response(jsonify('Username already exists.'), 409)

        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

@app.route("/login", methods=['POST'])
def login():
    if request.method == 'POST':
        request_body = request.get_json()
        username = request_body['username']
        password = request_body['password']
        auth_value = authUser(username, password)
        if auth_value == -1:
            response = make_response(jsonify('Username not found.'), 401)
        elif auth_value == 0:
            response = make_response(jsonify('Incorrect password.'), 403)
        else:
            token = issue_token(username)
            response = make_response(jsonify(token), 200)

        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

if __name__ == "__main__":
    app.run(ssl_context=('cert.pem', 'key.pem'))
    # app.run()
