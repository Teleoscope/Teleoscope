import {client_init, reorient, initialize_teleoscope, save_UI_state, initialize_session} from "../components/Stomp.js";
class DummyClient {
	publish(msg) {
		console.log(msg);
		return msg;
	}
}

test("testing dummy client publish", () => {
	expect(new DummyClient().publish({"msg":"hello"})).toStrictEqual({"msg":"hello"})
})

