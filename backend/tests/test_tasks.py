# Hack to import parent directory modules
import os, sys
currentdir = os.path.dirname(os.path.realpath(__file__))
parentdir = os.path.dirname(currentdir)
sys.path.append(parentdir)

import utils, pytest, tasks


@pytest.fixture(scope='module')
def session():
	"""Fixture to execute asserts before and after a test is run"""
	# Create a session
	print('\n*****SETUP*****')
	db = utils.connect()
	res = db.sessions.insert_one({"username": 'test', "history":[], "teleoscopes":[]})
	curr_session_id = str(res.inserted_id)
	yield db, curr_session_id # this is where the testing happens
	print('\n******TEARDOWN******')
	# remove the session
	db.sessions.remove({'_id': res.inserted_id})

# Test edge cases for initialize_teleoscope
# Case 1: Empty label 
def test_initialize_teleoscope_empty_label(session):
	db, curr_session_id = session
	assert tasks.initialize_teleoscope((), label = "") == []

# Case 2: Invalid session id - should throw an exception
def test_initialize_teleoscope_dummy_label(session):
	db, curr_session_id = session
	with pytest.raises(Exception):
		tasks.initialize_teleoscope((), label = "test label", session_id = 1010)
	# delete test label teleoscope from table
	db.teleoscopes.remove({ 'label': "test label" })

# Case 3: Valid label, and session id
def test_initialize_teleoscope_valid_label(session):
	db, curr_session_id = session
	try:
		print('curr_session_id: ', session)
		tasks.initialize_teleoscope((), label = "test label", session_id = curr_session_id)
	except Exception as e:
		assert False
	finally:
		db.teleoscopes.remove({ 'label': "test label" })


# Test edge cases for initialize_session

# Test edge cases for save_teleoscope_state

# Test edge cases for save_UI_state
