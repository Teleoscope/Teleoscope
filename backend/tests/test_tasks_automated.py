# Hack to import parent directory modules
import os, sys
currentdir = os.path.dirname(os.path.realpath(__file__))
parentdir = os.path.dirname(currentdir)
sys.path.append(parentdir)

import utils, pytest, tasks
from bson.objectid import ObjectId


# Tests
# ! Test cases for initialize_teleoscope
# Case 1: Empty label 
def test_initialize_teleoscope_empty_label():
	assert tasks.initialize_teleoscope((), label = "") == []


# Case 2: Missing kwargs
def test_initialize_session_missing_kwargs():
	with pytest.raises(Exception):
		tasks.initialize_session()


# ! Test cases for initialize_session
# Case 1: Empty username
def test_initialize_session_empty_username():
		with pytest.raises(Exception):
			tasks.initialize_session(username = "")

# Case 2: Invalid username - should throw an exception
def test_initialize_session_dummy_username():
	with pytest.raises(Exception):
		tasks.initialize_session(username = "test")


# Case 3: Missing kwargs 
def test_initialize_session_missing_kwargs():
	with pytest.raises(Exception):
		tasks.initialize_session()

# ! Test cases for save_teleoscope_state
# Case 1: invalid teleoscope id
def test_save_teleoscope_state_invalid_teleoscope_id():
	with pytest.raises(Exception):
		tasks.save_teleoscope_state(_id = "test", history_item = [])

# Case 2: Missing kwargs - history_item
def test_save_teleoscope_state_missing_kwargs():
	with pytest.raises(Exception):
		tasks.save_teleoscope_state(_id = "test")
	
# Case 3 Missing kwargs - _id
def test_save_teleoscope_state_missing_kwargs_id():
	with pytest.raises(Exception):
		tasks.save_teleoscope_state(history_item = [])

# Case 4: Invalid teleoscope id - should throw an exception
def test_save_teleoscope_state_dummy_teleoscope_id():
	with pytest.raises(Exception):
		tasks.save_teleoscope_state(_id = "test", history_item = [])

# ! Test cases for save_UI_state
# Case 1: Invalid session id
def test_save_UI_state_invalid_session_id():
	with pytest.raises(Exception):
		tasks.save_UI_state(session_id = "test", history_item = [])

# Case 2: Missing kwargs - history_item
def test_save_UI_state_missing_kwargs():
	with pytest.raises(Exception):
		tasks.save_UI_state(session_id = "test")
	
# Case 3 Missing kwargs - session_id
def test_save_UI_state_missing_kwargs_session_id():
	with pytest.raises(Exception):
		tasks.save_UI_state(history_item = [])

# ! Test cases for save_teleoscope_state
# Case 1: Missing id in history_object
def test_save_teleoscope_state_missing_id():
	with pytest.raises(Exception):
		tasks.save_teleoscope_state((), history_object = {"history_item": {}})

# Case 2: Missing history item
def test_save_teleoscope_state_missing_id():
	with pytest.raises(Exception):
		tasks.save_teleoscope_state((), history_object = {"_id": str(ObjectId())})

# ! Test cases for save_UI_state
# Case 1: Missing session id
def test_save_UI_state_missing_session_id():
	with pytest.raises(Exception):
		tasks.save_UI_state((), history_object = {"history_item": {}})

# Case 2: Missing history item
def test_save_UI_state_missing_history_item():
	with pytest.raises(Exception):
		tasks.save_UI_state((), history_object = {"session_id": str(ObjectId())})

# ! Test cases for add_group
# Case 1: Missing label
def test_add_group_missing_label():
	with pytest.raises(Exception):
		tasks.add_group((), color = "test", session_id = str(ObjectId()))

# Case 2: Missing color
def test_add_group_missing_color():
	with pytest.raises(Exception):
		tasks.add_group((), abel = "test", session_id = str(ObjectId()))

# Case 3: Missing session id
def test_add_group_missing_session_id():
	with pytest.raises(Exception):
		tasks.add_group((), label = "test", color = "test")

# ! Test cases for add_post_to_group
# Case 1: Missing group id
def test_add_post_to_group_missing_group_id():
	with pytest.raises(Exception):
		tasks.add_post_to_group(post_id = str(ObjectId()))

# Case 2: Missing post id
def test_add_post_to_group_missing_post_id():
	with pytest.raises(Exception):
		tasks.add_post_to_group(group_id = str(ObjectId()))

# ! Test cases for remove_post_from_group
# Case 1: Missing group id
def test_remove_post_from_group_missing_group_id():
	with pytest.raises(Exception):
		tasks.remove_post_from_group(post_id = str(ObjectId()))

# Case 2: Missing post id
def test_remove_post_from_group_missing_post_id():
	with pytest.raises(Exception):
		tasks.remove_post_from_group(group_id = str(ObjectId()))

# ! Test cases for update_group_label
# Case 1: Missing group id
def test_update_group_label_missing_group_id():
	with pytest.raises(Exception):
		tasks.update_group_label(label = "test")

# Case 2: Missing label
def test_update_group_label_missing_label():
	with pytest.raises(Exception):
		tasks.update_group_label(group_id = str(ObjectId()))

# ! Test cases for add_note
# Case 1: Missing post_id
def test_add_note_missing_post_id():
	with pytest.raises(Exception):
		tasks.add_note()

# ! Test cases for update_note
# Case 1: missing post_id
def test_update_note_missing_post_id():
	with pytest.raises(Exception):
		tasks.update_note((), content={})

# Case 2: missing content
def test_update_note_missing_content():
	with pytest.raises(Exception):
		tasks.update_note(post_id = '123')
