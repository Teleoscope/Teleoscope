// actions.js
import { createSlice } from '@reduxjs/toolkit'
console.log("Reloading ActiveSessionID ");
export const ActiveSessionID = createSlice({
  name: 'activeSessionID',
  initialState: {
    value: "-1",
    userid: "-1"
  },
  reducers: {
    sessionActivator: (state, action) => {
    	var id = action.payload // value of postid
			state.value = id;
      console.log("Session ID updated to: ", id)
    },
    loadActiveSessionID: (state, action) => {
      state.value = action.payload
    },
    setUserId: (state, action) => {
      state.userid = action.payload;
    }
  },
})

// Action creators are generated for each case reducer function
export const { sessionActivator, loadActiveSessionID, setUserId } = ActiveSessionID.actions

export default ActiveSessionID.reducer