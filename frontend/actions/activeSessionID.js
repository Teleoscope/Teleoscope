// actions.js
import { createSlice } from "@reduxjs/toolkit";

export const ActiveSessionID = createSlice({
  name: "activeSessionID",
  initialState: {
    value: -1,
    workspace: -1,
    database: -1,
    userid: -1,
    username: -1,
    replyToQueue: -1,
  },
  reducers: {
    setReplyToQueue: (state, action) => { 
      state.replyToQueue = action.payload; // string `${userid}%{randomuuid}`
    },
    sessionActivator: (state, action) => {
      var id = action.payload; // value of documentid
      if (id) {
        state.value = id;
      }
    },
    loadActiveSessionID: (state, action) => {
      state.value = action.payload;
    },
    setUserId: (state, action) => {
      state.userid = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { sessionActivator, loadActiveSessionID, setUserId, setReplyToQueue } =
  ActiveSessionID.actions;

export default ActiveSessionID.reducer;
