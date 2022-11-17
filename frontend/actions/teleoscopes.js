// actions.js
import { createSlice } from '@reduxjs/toolkit'
export const Teleoscopes = createSlice({
  name: 'teleoscopes',
  initialState: {
    magnitude: 0.5,
  },
  reducers: {
    setMagnitude: (state, action) => {
      state.magnitude = action.payload
    }
  },
})

// Action creators are generated for each case reducer function
export const { setMagnitude } = Teleoscopes.actions

export default Teleoscopes.reducer