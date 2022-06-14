// actions.js
import { createSlice } from '@reduxjs/toolkit'
export const Grouped = createSlice({
	name: 'grouped',
	initialState: {
		groups: [
			{
				label: "Red",
				color: "red"
			},
			{
				label: "Blue",
				color: "blue"
			},
			{
				label: 'Green',
				color: 'green'
			}
		],
		value: []
		// value: [id: '', label: 'Red']
	},
	reducers: {
		group: (state, action) => {
			// Redux Toolkit allows us to write "mutating" logic in reducers. It
			// doesn't actually mutate the state because it uses the Immer library,
			// which detects changes to a "draft state" and produces a brand new
			// immutable state based off those changes

			var post = action.payload
			var temp = [...state.value]

			var postID = temp.findIndex(object => {
				return (post.id === object.id)
			});

			var postIn = temp.findIndex(object => {
				return ((post.label === object.label) && (post.id === object.id))
			});


			if (postIn > -1) {
				// if the post is equal to the same object that is already 
				console.log("PostIn: " + postIn)
				temp.splice(postIn, 1);
			} else if (postID > -1) {
				// means that the post ID is in list without a group
				console.log("postID:" + postID)
				temp.splice(postID, 1);
				temp.push(post);
			} else {
				temp.push(post);
			}
			
			state.value = temp;
			console.log(state.value);
		},

		addGroup: (state, action) => {
			var post = action.payload;
			state.groups.push(post);
		}
	},
})

// Action creators are generated for each case reducer function
export const { group, addGroup } = Grouped.actions

export default Grouped.reducer