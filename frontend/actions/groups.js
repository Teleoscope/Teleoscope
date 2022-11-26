// actions.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
console.log("Loading groups.js");
const initialState = {
		groups: {
			// _id: {
		    //     color: "#ffffff"
		    //     label: "name"
		    // }
		},
		grouped_documents: [
			// document id, object id
			// {id: 'wer123', _id: 1234098jasdf }
		],
		loading: false
}

export const getGroups = createAsyncThunk(
	'groups/getGroups',
	async (id, thunkAPI) => {
		const res = await fetch(`/api/sessions/${id}/groups`).then(
			(data) => data.json()
		)
		return res
	})

export const Groups = createSlice({
	name: 'groups',
	initialState,
	reducers: {
		group: (state, action) => {
			var temp = [...state.grouped_documents];
			console.log(action.payload);

			// filters out any duplicates 
			var filter = temp.filter(item => action.payload.id == item.id && action.payload.label == item.label)

			// if there aren't duplicates then we push, else find index and splice
			if (filter.length == 0) {
				temp.push({ id: action.payload.id, label: action.payload.label })
				state.grouped_documents = temp;
			} else {
				var documentIndex = temp.indexOf(action.payload)
				temp.splice(documentIndex, 1);
				state.grouped_documents = temp;
			}
		},
	},
	extraReducers: {
		[getGroups.pending]: (state) => {
			state.loading = true;
		},
		[getGroups.fulfilled]: (state, { payload }) => {
			state.loading = false
			var groups = {}
			var groupedDocuments = [];
			payload.forEach((g) => {
				groups[g._id] = {
					color: g.color,
					label: g.label
				}
				var lastItem = g.history[0];
				lastItem.included_documents.forEach((i) => {
					groupedDocuments.push({ id: i, _id: g._id });
				})
			})
			console.log("groups fulfilled", groups)
			state.groups = groups;
			state.grouped_documents = groupedDocuments;
		},
		[getGroups.rejected]: (state) => {
			state.loading = false
		},
	},
})

// Action creators are generated for each case reducer function
export const { group, addGroup } = Groups.actions

export default Groups.reducer