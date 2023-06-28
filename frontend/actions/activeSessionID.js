// actions.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const ActiveSessionID = createSlice({
  name: "activeSessionID",
  initialState: { data: null, loading: false, error: null },
  reducers: {
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
  // extraReducers: (builder) => {
  //   builder
  //     .addCase(fetchInitialState.pending, (state) => {
  //       state.loading = true;
  //     })
  //     .addCase(fetchInitialState.fulfilled, (state, action) => {
  //       state.loading = false;
  //       state.data = action.payload;
  //     })
  //     .addCase(fetchInitialState.rejected, (state, action) => {
  //       state.loading = false;
  //       state.error = action.error.message;
  //     });
  // },
});

// Action creators are generated for each case reducer function
export const { sessionActivator, loadActiveSessionID, setUserId } =
  ActiveSessionID.actions;

export default ActiveSessionID.reducer;
