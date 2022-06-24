// actions.js
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import {client_init, add_group} from "../components/Stomp.js";

const initialState: {
	groups: {
		// "label": "#ffffff"
	},
	grouped_posts: [
		// {id: 'wer123', label: 'Red'}
	],
	client: client_init()
},

export const Grouped = createSlice({
	name: 'grouped',
	initialState,
	reducers: {
		group: (state, action) => {
			var temp = [...state.grouped_posts];
			var filter = temp.filter(item => action.payload.id == item.id && action.payload.label == item.label)
			if (filter.length == 0) {
				temp.push({id: action.payload.id, label: action.payload.label})	
				state.grouped_posts = temp;
			}
		},
		addGroup: (state, action) => {
			var temp = {...state.groups};
			temp[action.payload.label] = action.payload.color;
			add_group(state.client, action.payload.label, action.payload.color);
			state.groups = temp;
		}
	},
})

// Action creators are generated for each case reducer function
export const { group, addGroup } = Grouped.actions

export default Grouped.reducer