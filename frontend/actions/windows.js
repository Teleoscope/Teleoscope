// windows.js
import { createSlice } from '@reduxjs/toolkit'
import _ from 'lodash';
import { getDefaultWindow } from "../components/WindowFolder/WindowDefault"

console.log("Loading windows.js");

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
				h:2,
				isDraggable: true, 
				isResizable: false,
				type: "FABMenu"
			}
		],
		dragged: {id: "default", type: "Default"},
		collision: true,
	},
	reducers: {
		dragged: (state, action) => {
			state.dragged = action.payload;
		},
		collision: (state, action) => {
			state.collision = action.payload;
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
				temp.push(tempitem);
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
				temp[index].resizeHandles = [];
				temp[index].showWindow = false;
				
			}
			state.windows = temp;
		},
		maximizeWindow: (state, action) => {
			var temp = [...state.windows];
			var ids = state.windows.map((w) => {return w.i});
			var index = ids.indexOf(action.payload);
			if (index > -1) {
				temp[index].w = 5;
				temp[index].h = 9;
				temp[index].isResizable = true;
				temp[index].resizeHandles = ["se"];
				temp[index].showWindow = true;

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
		updateWindows: (state, action) => {
			var temp = [...state.windows]
			action.payload.forEach((w) => {
				var index = state.windows.findIndex(item => w.i === item.i)
				console.log("layout i", w, index)
				if (index > -1) {
					temp[index].x = w.x;
					temp[index].y = w.y;
					temp[index].h = w.h;
					temp[index].w = w.w; 	
				}
			})
			console.log("layout temp", temp)
			state.windows = temp;
			console.log("layout temp", temp, state.windows)

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
				if (w.type == "Document") {
					w.isChecked = true;		
				}
			})
			state.windows = temp;			
		},			
		loadWindows: (state, action) => {
			state.windows = action.payload;	
		}
	}
})

export const { 
	addWindow, 
	removeWindow, 
	loadWindows, 
	dragged, 
	updateWindow,
	updateWindows,
	minimizeWindow, 
	maximizeWindow, 
	checkWindow, 
	selectAll, 
	deselectAll,
	moveWindowToFront 
} = Windows.actions
export default Windows.reducer