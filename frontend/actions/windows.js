// windows.js
import { createSlice } from '@reduxjs/toolkit'
import _ from 'lodash';
import { getDefaultWindow } from "../components/WindowDefault"

export const Windows = createSlice({
	name: 'windows',
	initialState: {
		// See: https://github.com/react-grid-layout/react-grid-layout
		// for all of the possible grid item options for the layout
		// Added options:
		//	- surface: "Card", "AppBar", "Paper", "Accordion" // MUI surfaces
		windows: [
			{
				i: "default_FABMenu", 
				x:1, 
				y:1,
				w:1,
				h:1,
				isDraggable: true, 
				isResizable: true, 
				type: "FABMenu"
			}
		],
		dragged: {id: "default", type: "Default"}
	},
	reducers: {
		dragged: (state, action) => {
			state.dragged = action.payload;
		},
		addWindow: (state, action) => {
			var item = getDefaultWindow();
			// make sure that each default option that is being overridden
			// is set in the final object that gets sent to the window store
			Object.keys(action.payload).forEach((opt) => {
				item[opt] = action.payload[opt];
			})
			var temp = [...state.windows];
			
			if (!temp.find(item => item.i === action.payload.i)) {
				temp.push(item);
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
		moveWindowToFront: (state, action) => {
			var temp = [...state.windows];	
			var ids = state.windows.map((w) => {return w.i});
			var index = ids.indexOf(action.payload);

			if (index > -1) {
				var tempitem = {...temp[index]}
				temp.splice(index, 1);
				temp.splice(0, 0, tempitem);
			}
			state.windows = temp;			
		},
		minimizeWindow: (state, action) => {
			var temp = [...state.windows];
			var ids = state.windows.map((w) => {return w.i});
			var index = ids.indexOf(action.payload);
			if (index > -1) {
				temp[index].w = 4;
				temp[index].h = 1;
				temp[index].isResizable = false;
			}
			state.windows = temp;	
		},
		maximizeWindow: (state, action) => {
			var temp = [...state.windows];
			var ids = state.windows.map((w) => {return w.i});
			var index = ids.indexOf(action.payload);
			if (index > -1) {
				temp[index].w = 8;
				temp[index].h = 6;
				temp[index].isResizable = true;
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
		// checkWindow({i: str, check: bool})
		checkWindow: (state, action) => {
			var index = state.windows.findIndex((w) => w.i == action.payload.i);
			if (index > 0) {
				state.windows[index].isChecked = action.payload.check;
			}
		},
		deselectAll: (state, action) => {
			var temp = [...state.windows];
			temp.forEach((w) => {
				w.isChecked = false;	
			})
			state.windows = temp;			
		},
		selectAll: (state, action) => {
			var temp = [...state.windows];
			temp.forEach((w) => {
				if (w.type == "Post") {
					w.isChecked = true;		
				}
			})
			state.windows = temp;			
		},			
		loadWindows: (state, action) => {
			// var temp = [...state.windows];
			for (var index in action.payload) {
				var update = action.payload[index];
				var item = state.windows.find(item => item.i === update.i)
				if (item) {
					Object.keys(update).forEach((key, ind) => {
						if (item.hasOwnProperty(key)) {
							item[key] = update[key];
						}
					});
				}
			}
			
		}
	}
})

export const { 
	addWindow, 
	removeWindow, 
	loadWindows, 
	dragged, 
	updateWindow, 
	minimizeWindow, 
	maximizeWindow, 
	checkWindow, 
	selectAll, 
	deselectAll,
	moveWindowToFront 
} = Windows.actions
export default Windows.reducer