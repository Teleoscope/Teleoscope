// actions.js
import { createSlice } from '@reduxjs/toolkit'
export const SearchTerm = createSlice({
  name: 'search_term',
  initialState: {
    value: "", // list of string: postids 
  },
  reducers: {
    searcher: (state, action) => {
		// Redux Toolkit allows us to write "mutating" logic in reducers. It
		// doesn't actually mutate the state because it uses the Immer library,
			// which detects changes to a "draft state" and produces a brand new
			// immutable state based off those changes
	    var search_term = action.payload // value of postid
			state.value = search_term
    },
  },
})

// Action creators are generated for each case reducer function
export const { searcher } = SearchTerm.actions

export default SearchTerm.reducer