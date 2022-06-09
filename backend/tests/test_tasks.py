# Hack to import parent directory modules
import os, sys
currentdir = os.path.dirname(os.path.realpath(__file__))
parentdir = os.path.dirname(currentdir)
sys.path.append(parentdir)

import pytest
import tasks
# Test for tasks.py
# Test edge cases for initialize_teleoscope
# Case 1: Empty label
def test_initialize_teleoscope_empty_label():
	assert tasks.initialize_teleoscope((), label = "") == []

# Test edge cases for initialize_session

# Test edge cases for save_teleoscope_state

# Test edge cases for save_UI_state
