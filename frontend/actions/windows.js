// windows.js
import { createSlice } from '@reduxjs/toolkit'
import _ from 'lodash';

export const Windows = createSlice({
	name: 'windows',
	initialState: {
		// See: https://github.com/react-grid-layout/react-grid-layout
		// for all of the possible grid item options for the layout
		// Added options:
		//	- surface: "Card", "AppBar", "Paper", "Accordion" // MUI surfaces
		windows: [
				{i: "v20r7t", x: 0, y: 0, w: 1, h: 2, type: "Post"},
				{i: "v20r36", x: 1, y: 0, w: 5, h: 2, type: "Post"},
		],
		dragged: ""
	},
	reducers: {
		dragged: (state, action) => {
			state.dragged = action.payload;
		},
		addWindow: (state, action) => {
			var temp = [...state.windows];
			console.log("action.payload", action.payload)
			if (!temp.find(item => item.i === action.payload.i)) {
				var obj = {
					i: action.payload.i,
					x: action.payload.x, 
					y: action.payload.y,
					w: action.payload.w,
					h: action.payload.h,
					type: "Post"
				};
				temp.push(obj);
				state.windows = temp;
			}
		},
		removeWindow: (state, action) => {
			var temp = [...state.windows];
		},
		reload: (state, action) => {
			for (var index in action.payload) {
				var update = action.payload[index];
				var item = state.windows.find(item => item.i === update.i)
				if (item) {
					Object.keys(update).forEach((key, ind) => {
						if (item.hasOwnProperty(key)) {
							item[key] = update[key];
						}
					});
				} else {
					console.log("drop", update);
				}
			}
		}
	}
})

export const { addWindow, reload, dragged } = Windows.actions
export default Windows.reducer