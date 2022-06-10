import { publish, client_init, reorient, initialize_teleoscope, save_UI_state, initialize_session } from "../components/Stomp.js";

class DummyClient {
	publish(msg) {
		console.log(msg);
		return msg;
	}
}

// Syncronous tests all using DummyClient to check return values

// testing the test suite
test("Testing dummy client publish.", () => {
	expect(new DummyClient().publish({ "msg": "hello" })).toStrictEqual({ "msg": "hello" })
})

// publish
test("Testing Stomp.js publish with dummy client.", () => {
	expect(publish(new DummyClient(), {})).toStrictEqual({});
})

// initialize_session
test("Testing initialize_session return value.", () => {
	expect(initialize_session(new DummyClient(), "paul"
	)).toStrictEqual(
		{
			"task": "initialize_session",
			"args": {
				"username": "paul"
			}
		}
	);
})

// initialize_teleoscope
test("Testing initialize_teleoscope return value.", () => {
	expect(initialize_teleoscope(new DummyClient(), "test label", '62a24ba3a43e59841cacad9d'
	)).toStrictEqual(
		{
			"task": "initialize_teleoscope",
			"args": {
				"label": "test label",
				// This is not a valid booking id - needs to be hex alphanurmeric
				"session_id": '62a24ba3a43e59841cacad9d',
			}
		}
	);
})