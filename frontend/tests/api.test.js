test('Getting one session from a list of sessions.', () => {
    const session_example = {
        "_id": "633f65ba72256b4c3e78a573",
        "creation_time": "2022-10-06T23:33:14.274Z",
        "userlist": {
          "paul": "read",
          "test": "write"
        },
        "history": [
          {
            "timestamp": "2022-10-06T23:33:14.274Z",
            "bookmarks": [],
            "windows": [],
            "groups": [],
            "mlgroups": [],
            "label": "poised",
            "color": "#7c4bcc"
          }
        ],
        "teleoscopes": []
      }
    return fetch("http://localhost:3000/api/sessions")
    .then(res => res.json())
    .then(data => expect(data[0]).toMatchObject(session_example))
});

test('Getting a single session by ID.', () => {
    const session_example = {"_id":"633f65ba72256b4c3e78a573","creation_time":"2022-10-06T23:33:14.274Z","userlist":{"paul":"read","test":"write"},"history":[{"timestamp":"2022-10-06T23:33:14.274Z","bookmarks":[],"windows":[],"groups":[],"clusters":[],"label":"poised","color":"#7c4bcc"}],"teleoscopes":[]}
    return fetch("http://localhost:3000/api/sessions/633f65ba72256b4c3e78a573")
    .then(res => res.json())
    .then(data => expect(data).toMatchObject(session_example))
});