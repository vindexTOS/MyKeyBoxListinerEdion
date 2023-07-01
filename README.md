# To run the API

$ `pipenv shell`

$ `pipenv install`

$ `pipenv run python -m flask --app app run --host=0.0.0.0`

API will be running on `http://{DEVICE_IP}:5000`. Use this IP address in the app.

# Endpoints

-   `/` To check the status of the API. Returns `200` - `{ "status": "up" }`
-   `/api/status` Returns the JSON about states of the doors and the timestamp of when it was last updates

```
{
    "doors": int[],
    "last_updated": float
}
```

-   `/api/open/<id: int>` Saves the door ID to pass it on in the state. Echoes the door ID.
-   `/post/<status: string>` Parses the status JSON string as an array and updates the internal state. Also clears the `doorId` from the state and returns it.
    _Internal for the app. Not for outside consumption._

# Bad responses

-   `400` from `/api/open/<id: int>` with `{ "error": "Door already opening" }` means that a request to open a door was sent before the last one was processed. This either means that two requests to open a door were sent in a short time span (<50ms) or that there's an issue with the app (check the last update time from `/api/status`)

-   `400` from `/api/open/<id: int>` with `{ "error": "Invalid door number" }` means that the value for `id` couldn't be parsed into an integer.
