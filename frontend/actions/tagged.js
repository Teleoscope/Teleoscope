// actions.js
import { createSlice } from '@reduxjs/toolkit'
export const Tagged = createSlice({
  name: 'tagged',
  initialState: {
    value: [], // list of string: postids 
  },
  reducers: {
    tag: (state, action) => {
		// Redux Toolkit allows us to write "mutating" logic in reducers. It
		// doesn't actually mutate the state because it uses the Immer library,
		// which detects changes to a "draft state" and produces a brand new
		// immutable state based off those changes

	   var post = action.payload 
		var temp = [...state.value]
		var i = temp.findIndex(object => {
			return (object.id === post.id) && (object.color === post.color);
			// this accounts for deleting the specific postID and color
			// combination from the list
		});

		if (i > -1) {
		  temp.splice(i, 1)
		} else {

			let inTemp = temp.findIndex(tempID => { return (tempID.id === post.id )});
			// since different colors account for different objects, we need to 
			if (inTemp > -1) {
				temp[inTemp].color = post.color;
				temp[inTemp].tag = post.tag;
			} else {
				temp.push(post)
			}
		}
		state.value = temp;
    }
  },
})

// Action creators are generated for each case reducer function
export const { tag } = Tagged.actions

export default Tagged.reducer