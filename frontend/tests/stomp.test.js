import { client_init, publish, initialize_session, save_UI_state, initialize_teleoscope, save_teleoscope_state, add_group, add_post_to_group, remove_post_from_group, update_group_label, add_note, update_note, reorient, cluster_by_groups } from "../components/Stomp.ts";

class DummyClient {
	publish(msg) {
		console.log(msg);
		return msg;
	}
}

// Synchronous tests all using DummyClient to check return values

// testing the test suite
test("Testing dummy client publish.", () => {
	expect(new DummyClient().publish({ "msg": "hello" })).toStrictEqual({ "msg": "hello" })
})

// publish
test("Testing Stomp publish with dummy client.", () => {
	expect(publish(new DummyClient(), {})).toStrictEqual({});
})

// initialize_session() return value
test("Testing initialize_session return value.", () => {
	expect(initialize_session(new DummyClient(), "paul", "test", "#ffffff")
	).toStrictEqual(
		{
			"task": "initialize_session",
			"args": {
				"username": "paul",
				"label": "test",
				"color": "#ffffff"
			}
		}
	);
})

// save_UI_state() return value
test("Testing save_UI_state return value.", () => {
	expect(save_UI_state(
		new DummyClient(), 
		"62a24ba3a43e59841cacad9d", 
		{"groups": ["62a24ba3a43e59841cacad9d"],
		 "bookmarks": ["pgs9hs"],
		 "windows": [{"i": "v20r7t", "h": 2, "w": 1, "x": 0, "y": 1, "static": false, "isDraggable": true}]}
		 )).toStrictEqual(
			 {
				 "task": "save_UI_state",
				 "args": {
					 "session_id": "62a24ba3a43e59841cacad9d",
					 "history_item": {
						 "groups": ["62a24ba3a43e59841cacad9d"],
						 "bookmarks": ["pgs9hs"],
						 "windows": [{"i": "v20r7t", "h": 2, "w": 1, "x": 0, "y": 1, "static": false, "isDraggable": true}]
						}
				 }
			 }
		 );
})

// initialize_teleoscope() return value
test("Testing initialize_teleoscope return value.", () => {
	expect(initialize_teleoscope(new DummyClient(), "62a24ba3a43e59841cacad9d"
	)).toStrictEqual(
		{
			"task": "initialize_teleoscope",
			"args": {
				"session_id": "62a24ba3a43e59841cacad9d",
			}
		}
	);
})

// save_teleoscope_state() return value
test("Testing save_teleoscope_state return value.", () => {
	expect(save_teleoscope_state(
		new DummyClient(), 
		"62a24ba3a43e59841cacad9d",
		{
			"label": "wifi",
			"positive_docs": [],
			"negative_docs": [],
			"stateVector": [],
			"ranked_post_ids": "62a96ba3a43e59841cacad9d",
			"rank_slice": []}
		 )).toStrictEqual(
			 {
				 "task": "save_teleoscope_state",
				 "args": {
					 "_id": "62a24ba3a43e59841cacad9d",
					 "history_item": {
						"label": "wifi",
						"positive_docs": [],
						"negative_docs": [],
						"stateVector": [],
						"ranked_post_ids": "62a96ba3a43e59841cacad9d",
						"rank_slice": []
					 } 
				 }
			 }
		 );
})

// add_group() return value
test("Testing add_group return value.", () => {
	expect(add_group(
		new DummyClient(),
		"wifi",
		"#8c564b",
		"62a24ba3a43e59841cacad9d"
	)).toStrictEqual(
		{
			"task": "add_group",
			"args": {
				"session_id": "62a24ba3a43e59841cacad9d",
				"label": "wifi",
				"color": "#8c564b"
			}
		}
	);
})

// add_post_to_group() return value
test("Testing add_post_to_group return value.", () => {
	expect(add_post_to_group(
		new DummyClient(),
		"62a24ba3a43e59841cacad9d",
		"v20r7t"
	)).toStrictEqual(
		{
			"task": "add_post_to_group",
			"args": {
				"group_id": "62a24ba3a43e59841cacad9d",
				"post_id": "v20r7t"
			}
		}
	);
})

// remove_post_from_group() return value
test("Testing remove_post_from_group return value.", () => {
	expect(remove_post_from_group(
		new DummyClient(),
		"62a24ba3a43e59841cacad9d",
		"v20r7t"
	)).toStrictEqual(
		{
			"task": "remove_post_from_group",
			"args": {
				"group_id": "62a24ba3a43e59841cacad9d",
				"post_id": "v20r7t"
			}
		}
	);
});

// update_group_label() return value
test("Testing update_group_label return value.", () => {
	expect(update_group_label(
		new DummyClient(),
		"62a24ba3a43e59841cacad9d",
		"security"
	)).toStrictEqual(
		{
			"task": "update_group_label",
			"args": {
				"group_id": "62a24ba3a43e59841cacad9d",
				"label": "security"
			}
		}
	);
});

// add_note() return value
test("Testing add_note return value.", () => {
	expect(add_note(
		new DummyClient(),
		"v20r7t"
	)).toStrictEqual(
		{
			"task": "add_note",
			"args": {
				"post_id": "v20r7t"
			}
		}
	);
});

// update_note() return value
test("Testing update_note return value.", () => {
	expect(update_note(
		new DummyClient(),
		"v20r7t",
		"lorem ipsum dolor"
	)).toStrictEqual(
		{
			"task": "update_note",
			"args": {
				"post_id": "v20r7t",
				"content": "lorem ipsum dolor"
			}
		}
	);
});

// reorient() return value
test("Testing reorient return value.", () => {
	expect(reorient(
		new DummyClient(),
		"62a24ba3a43e59841cacad9d",
		["v20r7t"],
		[]
	)).toStrictEqual(
		{
			"task": "reorient",
			"args": {
				"teleoscope_id": "62a24ba3a43e59841cacad9d",
				"positive_docs": ["v20r7t"],
				"negative_docs": []
			}
		}
	)
});

test("Testing cluster_by_groups return value.", () => {
	expect(cluster_by_groups(
		new DummyClient(),
		["62a24ba3a43e59841cacad9d"],
		"62a24ba3a43e59841cacad9d",
		"62a24ba3a43e59841cacad9d"
	)).toStrictEqual(
		{
			"task": "cluster_by_groups",
			"args": {
				"group_id_strings": ["62a24ba3a43e59841cacad9d"],
				"teleoscope_oid": "62a24ba3a43e59841cacad9d",
				"session_oid": "62a24ba3a43e59841cacad9d",
			}
		}
	)
});