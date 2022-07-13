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
		],
		dragged: ""
	},
	reducers: {
		dragged: (state, action) => {
			state.dragged = action.payload;
		},
		addWindow: (state, action) => {
			var temp = [...state.windows];
			if (!temp.find(item => item.i === action.payload.i)) {
				var obj = {
					i: action.payload.i.split("_")[0],
					x: action.payload.x, 
					y: action.payload.y,
					w: action.payload.w,
					h: action.payload.h,
					// isResizable: action.payload.type == "Teleoscope" ? false : true,
					isResizable: action.payload.type == "Teleoscope" ? true : true,
					type: action.payload.type,
				};
				temp.push(obj);
				state.windows = temp;
			}
		},
		removeWindow: (state, action) => {
			var temp = [...state.windows];
			var ids = state.windows.map((w) => {return w.i});
			var index = ids.indexOf(action.payload);
			if (index > -1) {
				temp.splice(index, 1);
			}
			state.windows = temp;
		},
		updateWindow: (state, action) => {
			var temp = [...state.windows];
			var index = temp.findIndex((w) => w.i == action.payload.i);
			if (index > 0) {
				temp[index].i = action.payload.term + "%search";
			}
			state.windows = temp;
		},
		loadWindows: (state, action) => {
			var temp = [...state.windows];
			for (var index in action.payload) {
				var update = action.payload[index];
				var item = temp.find(item => item.i === update.i)
				if (item) {
					Object.keys(update).forEach((key, ind) => {
						if (item.hasOwnProperty(key)) {
							item[key] = update[key];
						}
					});
				} else {
					if (update.hasOwnProperty("i")) {
						console.log(update)
						temp.push(update);
					}
				}
			}
			state.windows = temp;
		}
	}
})

export const { addWindow, removeWindow, loadWindows, dragged, updateWindow } = Windows.actions
export default Windows.reducer