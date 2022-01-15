// actions.js
import { createSlice } from '@reduxjs/toolkit'
export const Fav = createSlice({
  name: 'fav',
  initialState: {
    value: [],
  },
  reducers: {
    fav: (state, action) => {
		// Redux Toolkit allows us to write "mutating" logic in reducers. It
		// doesn't actually mutate the state because it uses the Immer library,
		// which detects changes to a "draft state" and produces a brand new
		// immutable state based off those changes
    	var id = action.payload
		var temp = [...state.value]
		// add to favs if not in
		// remove from favs if in
		var i = temp.indexOf(id)
		if (i > -1) {
		  temp.splice(i, 1)
		} else {
		  temp.push(id)
		}
		state.value = temp
    },
  },
})

// Action creators are generated for each case reducer function
export const { fav } = Fav.actions

export default Fav.reducer