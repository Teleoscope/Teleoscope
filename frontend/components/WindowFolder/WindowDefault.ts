export function getDefaultWindow() {
	var item = {
		i: "default_window",
		x: 20,
		y: 0,
		w: 2,
		h: 1,
		minW: 1,
		maxW: 10,
		minH: 1,
		maxH: 20,
		static: false,
		isDraggable: true,
		isResizable: true,
		resizeHandles: ['se'], // <'s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'> 
		isBounded: true,
		type: "Default",
		isChecked: false
	}
	return item;
}