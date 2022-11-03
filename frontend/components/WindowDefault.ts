export function getDefaultWindow() {
	var item = {
		i: "default_window",
		x: 0,
		y: 0,
		w: 4,
		h: 1,
		minW: 1,
		maxW: 10,
		minH: 1,
		maxH: 10,
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