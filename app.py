import json
import pickle
import time

from flask import Flask, request, Response
from flask_cors import CORS
import requests

from .state import State

app = Flask(__name__)
CORS(app)


@app.route("/")
def main():
    return "up", 200


@app.route("/api/proxy/<path:any_wildcard_here>", methods=['POST', 'GET'])
def proxy(any_wildcard_here):
    target_url = "https://mykeybox.office.saatec.ge/Umbraco/Api/MyKeyBoxOrder/" + any_wildcard_here + "?" + request.query_string.decode('utf-8')

    headers = {
        'ApiKey': 'z7#D4k9@A9',
    }

    # Copy the client's headers and add the additional headers
    proxy_headers = {k:v for k,v in request.headers if k.lower() != 'host'}
    proxy_headers.update(headers)


    if request.method == 'POST':
        response = requests.post(target_url, headers=proxy_headers)
    else:
        response = requests.get(target_url, headers=proxy_headers)


    excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']  #NOTE we here exclude all "hop-by-hop headers" defined by RFC 2616 section 13.5.1 ref. https://www.rfc-editor.org/rfc/rfc2616#section-13.5.1
    headers          = [
        (k,v) for k,v in response.raw.headers.items()
        if k.lower() not in excluded_headers
    ]

    response = Response(response.content, response.status_code, headers)
    return response



@app.route("/api/status")
def get_status():
    try:
        state: State = pickle.load(open("state.pickle", "rb"))
    except:
        state = State()
    return {"doors": state.door_status, "last_updated": state.last_updated}


@app.route("/api/open/<int:door>")
def open_door(door: str):
    state: State = pickle.load(open("state.pickle", "rb"))
    if state.to_open is not None:
        return {"error": "Door already opening"}, 400
    try:
        state.to_open = int(door)
        pickle.dump(state, open("state.pickle", "wb"))
        return {"doorId": door}, 200
    except ValueError:
        return {"error": "Invalid door number"}, 400


@app.route("/post/<string:arr>")
def test_(arr: str):
    try:
        list_ = json.loads(arr)
    except:
        return {"error": "Invalid JSON"}, 400
    try:
        state = pickle.load(open("state.pickle", "rb"))
    except:
        state = State()
    state.door_status = list_
    door = state.to_open
    state.to_open = None
    state.last_updated = time.time() * 1000
    pickle.dump(state, open("state.pickle", "wb"))

    return str(door) if door is not None else "null", 200
