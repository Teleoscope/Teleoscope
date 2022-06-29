// actions.js
import { speedDialIconClasses } from '@mui/material';
import { createSlice } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit'
import { add_group } from "../components/Stomp";


const initialState = {
		groups: {
			// "label": "#ffffff"
		},
		grouped_posts: [
			// {id: 'wer123', label: 'Red'}
		],
		loading: false
}

export const getGroups = createAsyncThunk(
	'groups/getGroups',
	async (thunkAPI) => {
		const res = await fetch('/api/groups').then(

			(data) => data.json()
		)	
	console.log("groups fetch", res)
	return res
})

export const Groups = createSlice({
	name: 'groups',
	initialState,
	reducers: {
		group: (state, action) => {
			var temp = [...state.grouped_posts];
			console.log(action.payload);

			// filters out any duplicates 
			var filter = temp.filter(item => action.payload.id == item.id && action.payload.label == item.label)

			// if there aren't duplicates then we push, else find index and splice
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
			temp[action.payload.label] = action.payload.color;
			add_group(action.payload.client, action.payload.label, action.payload.color);
			state.groups = temp;
			console.log(state.groups)
		}
	},
	extraReducers: {
		[getGroups.pending]: (state) => {
			state.loading = true;
		},
		[getGroups.fulfilled]: (state, {payload}) => {
			state.loading = false
			var groups = {}
			payload.forEach((g) => {
				groups[g.label] = g.color;
			})
			console.log("groups fulfilled", groups)
			state.groups = groups;
		},
		[getGroups.rejected]: (state) => {
			state.loading = false
		},
	},
})

// Action creators are generated for each case reducer function
export const { group, addGroup } = Groups.actions

export default Groups.reducer