export function getDefaultWindow() {
	var item = {
		i: "default_window",
		x: 0,
		y: 0,
		w: 1,
		h: 1,
		minW: 1,
		maxW: 10000,
		minH: 1,
		maxH: 10000,
		static: false,
		isDraggable: true,
		isResizable: true,
		resizeHandles: ['se'], // <'s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'> 
		isBounded: false,
		type: "Default",
		isChecked: false
	}
	return item;
}