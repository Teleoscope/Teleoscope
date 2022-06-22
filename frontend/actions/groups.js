// actions.js
import { speedDialIconClasses } from '@mui/material';
import { createSlice } from '@reduxjs/toolkit'
export const Grouped = createSlice({
	name: 'grouped',
	initialState: {
		groups: {
			// "label": "#ffffff"
		},
		grouped_posts: []
			// {id: 'wer123', label: 'Red'}
	},
	reducers: {
		group: (state, action) => {
			var temp = [...state.grouped_posts];
			console.log(action.payload);
			var filter = temp.filter(item => action.payload.id == item.id && action.payload.label == item.label)
			if (filter.length == 0) {
				temp.push({id: action.payload.id, label: action.payload.label})	
				state.grouped_posts = temp;
			} else {
				var postIndex = temp.indexOf(action.payload)
				temp.splice(postIndex, 1);
				state.grouped_posts = temp;
			}
		},
		addGroup: (state, action) => {
			var temp = {...state.groups};
			console.log(temp)
			temp[action.payload.label] = action.payload.color;
			state.groups = temp;
		}
	},
})

// Action creators are generated for each case reducer function
export const { group, addGroup } = Grouped.actions

export default Grouped.reducer