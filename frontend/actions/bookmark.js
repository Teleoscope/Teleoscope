// actions.js
import { createSlice } from '@reduxjs/toolkit'
export const Bookmark = createSlice({
  name: 'bookmark',
  initialState: {
    value: [], // list of string: postids 
  },
  reducers: {
    mark: (state, action) => {
		// Redux Toolkit allows us to write "mutating" logic in reducers. It
		// doesn't actually mutate the state because it uses the Immer library,
			// which detects changes to a "draft state" and produces a brand new
			// immutable state based off those changes
	    var id = action.payload // value of postid
			var temp = [...state.value]
			// add to workspace
		var i = temp.indexOf(id)
		if (i > -1) {
		  temp.splice(i, 1)
		} else {
		  temp.push(id)
		}
			state.value = temp
    }
  },
})

// Action creators are generated for each case reducer function
export const { mark, unbookmark } = Bookmark.actions

export default Bookmark.reducer