// actions.js
import { createSlice } from '@reduxjs/toolkit'
export const ActiveTeleoscopeID = createSlice({
  name: 'activeTeleoscopeID',
  initialState: {
    value: -1,
  },
  reducers: {
    activator: (state, action) => {
		// Redux Toolkit allows us to write "mutating" logic in reducers. It
		// doesn't actually mutate the state because it uses the Immer library,
		// which detects changes to a "draft state" and produces a brand new
		// immutable state based off those changes
    	var id = action.payload // value of postid
			state.value = id;
    },
    loadActiveTeleoscopeID: (state, action) => {
      state.value = action.payload
    }
  },
})

// Action creators are generated for each case reducer function
export const { activator, loadActiveTeleoscopeID } = ActiveTeleoscopeID.actions

export default ActiveTeleoscopeID.reducer