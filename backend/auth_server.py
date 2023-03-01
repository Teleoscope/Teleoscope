from flask import Flask, request, make_response, jsonify
from flask_cors import CORS

from authenticate import *

app = Flask(__name__)
CORS(app)

@app.route("/login", methods=['POST'])
def hello_world():
    if request.method == 'POST':
        request_body = request.get_json()
        username = request_body['username']
        password = request_body['password']
        # username = request.form['username']
        # password = request.form['password']
        auth_value = authUser(username, password)
        if auth_value == -1:
            response = make_response(jsonify('Username not found'), 401)
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response
        elif auth_value == 0:
            response = make_response(jsonify('Incorrect password'), 403)
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response
        else:
            token = issue_token(username)
            response = make_response(jsonify(token), 200)
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response

if __name__ == "__main__":
    app.run(ssl_context=('cert.pem', 'key.pem'))
    # app.run()
