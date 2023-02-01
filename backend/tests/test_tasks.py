# Hack to import parent directory modules
import os, sys
currentdir = os.path.dirname(os.path.realpath(__file__))
parentdir = os.path.dirname(currentdir)
sys.path.append(parentdir)

import utils, pytest, tasks


# ! Setup
@pytest.fixture
def db():
	db = utils.connect()
	yield db

@pytest.fixture
def session(db):
	"""Fixture to execute asserts before and after a test is run"""
	# Create a session
	res = db.sessions.insert_one({"username": 'test', "history":[], "teleoscopes":[]})
	curr_session_id = str(res.inserted_id)
	yield curr_session_id # this is where the testing happens
	# remove the session
	db.sessions.delete_one({'_id': res.inserted_id})

@pytest.fixture
def user(db):
	"""Fixture to execute asserts before and after a test is run"""
	# Create a user
	res = db.users.insert_one({"username": 'test', "password_hash": hash('test'), 'sessions': []})
	curr_user_id = str(res.inserted_id)
	yield 'test' # this is where the testing happens
	# Remove the user
	db.users.delete_one({'_id': res.inserted_id})


# ! Test cases for initialize_teleoscope
# Case 1: Invalid session id - should throw an exception
def test_initialize_teleoscope_dummy_label(db):
	with pytest.raises(Exception):
		tasks.initialize_teleoscope((), label = "test label", session_id = 1010)
	# delete test label teleoscope from table
	db.teleoscopes.delete_one({ 'label': "test label" })

# Case 2: Valid label, and session id
def test_initialize_teleoscope_valid_label(db, session):
	try:
		tasks.initialize_teleoscope((), label = "test label", session_id = session)
	except Exception as e:
		pytest.fail(e)
	finally:
		db.teleoscopes.delete_one({ 'label': "test label" })


# ! Test cases for initialize_session
# Case 1: Valid username - should not throw an exception
def test_initialize_session_valid_username(db, user):
		try:
			tasks.initialize_session(username = user)
		except Exception as e:
			pytest.fail(e)
		finally:
			# Remove session
			db.sessions.delete_one({'username': 'test'})
	
# ! Test cases for save_teleoscope_state
# Case 1: Invalid Teleoscope id
def test_save_teleoscope_state_invalid_id():
	with pytest.raises(Exception):
		tasks.save_teleoscope_state((), history_object = {"_id": '42', "history_item": {}})

# ! Test cases for save_UI_state
# Case 1: Invalid session id
def test_save_UI_state_invalid_session_id():
	with pytest.raises(Exception):
		tasks.save_UI_state((), history_object = {"_id": '42', "history_item": {}})

# ! Test cases for add_group
# Case 1: Invalid session id
def test_add_group_invalid_session_id():
	with pytest.raises(Exception):
		tasks.add_group((), label = "test label", color = "test color", session_id = '42')

# ! Test cases for add_document_to_group
# Case 1: Invalid group id
def test_add_document_to_group_invalid_group_id():
	with pytest.raises(Exception):
		tasks.add_document_to_group((), document_id = '42', group_id = '42')

# ! Test cases for remove_document_from_group
# Case 2: Invalid group id
def test_remove_document_from_group_invalid_group_id():
	with pytest.raises(Exception):
		tasks.remove_document_from_group((), document_id = '42', group_id = '42')

# ! Test cases for update group_label
# Case 2: Invalid group id
def test_update_group_label_invalid_group_id():
	with pytest.raises(Exception):
		tasks.update_group_label((), group_id = '42', label = 'test label')

# ! Test cases for add_note
# Case 1: Invalid document_id
def test_add_note_invalid_document_id():
	with pytest.raises(Exception):
		tasks.add_note((), document_id = '42')

# ! Test cases for update_note
# Case 1: Invalid document_id
def test_update_note_invalid_document_id():
	with pytest.raises(Exception):
		tasks.update_note((), document_id = '42', content={})


# ! Test cases for vectorize_text
# Case 1: Empty string
def test_vectorize_text_empty_string():
	with pytest.raises(Exception):
		tasks.vectorize_text((), text = "")

# ! Test cases for create_child
# Case1: invalid document_id


