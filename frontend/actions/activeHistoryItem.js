// actions.js
import { createSlice } from '@reduxjs/toolkit'
export const ActiveHistoryItem = createSlice({
  name: 'activeHistoryItem',
  initialState: {
    value: 0,
  },
  reducers: {
    historyActivator: (state, action) => {
		// Redux Toolkit allows us to write "mutating" logic in reducers. It
		// doesn't actually mutate the state because it uses the Immer library,
		// which detects changes to a "draft state" and produces a brand new
		// immutable state based off those changes
    	var id = action.payload // value of documentid
			state.value = id;
    },
    loadActiveHistoryItem: (state, action) => {
      state.value = action.payload
    }
  },
})

// Action creators are generated for each case reducer function
export const { historyActivator, loadActiveHistoryItem } = ActiveHistoryItem.actions

export default ActiveHistoryItem.reducer