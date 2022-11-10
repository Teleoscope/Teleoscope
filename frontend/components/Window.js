// Window.js
import React, { useState } from "react";

// custom
import WindowTopBar from "../components/WindowTopBar";

// mui
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';

// actions
import { useSelector, useDispatch } from "react-redux";
import { minimizeWindow, maximizeWindow, checkWindow, removeWindow } from "../actions/windows";

export default React.forwardRef(({ style, className, onMouseDown, onMouseUp, onTouchEnd, ...props }, ref) => {
	const [show, setShow] = useState(props.showWindow);
	const [drag, setDrag] = useState(true);
	const w = props.windata;
	const dispatch = useDispatch();
	
	const handleMove = (e) => {
		if (e.buttons == 1) {
			setDrag(true);
		} else {
			setDrag(false);
		}
	}

	const handleSelect = (e) => {
		if (e.shiftKey) {
			dispatch(checkWindow({ i: w.i, check: !w.isChecked }))
		}
	}

	const handleChipClick = (e) => {
		if (e.shiftKey) {
			dispatch(checkWindow({ i: w.i, check: !w.isChecked }))
		} else {
			handleShow();
		}
	}

	const handleShow = () => {
		if (show) {
			dispatch(minimizeWindow(props.id));
			setShow(false);
		}
		if (!show && !drag) {
			dispatch(maximizeWindow(props.id));
			setShow(true);
		}
	}

	const handleDelete = () => {
		dispatch(removeWindow(props.id));
	}

	if (!show) {
		return (
			<Chip
				label={props.title}
				icon={props.icon}
				clickable
				onDelete={handleDelete}
				onClick={(e) => handleChipClick(e)}
				className="drag-handle"
				onMouseMove={(e) => handleMove(e)}
				sx={{
					border: w.isChecked ? `2px solid ${props.color}` : "1px solid #DDDDDD",
					boxShadow: '1',
					cursor: "move",
					backgroundColor: "white",
					[`& .MuiChip-icon`]: {
						color: props.color
					  }
				}}
			/>
		)
	}

	return (
		<Card
			variant="outlined"
			style={{
				borderColor: w.isChecked ? props.color : "#DDDDDD",
				borderWidth: w.isChecked ? 2 : 1,
				backgroundColor: "white",
				height: "100%",
			}}
			sx={{
				boxShadow: '1',
			}}
		><CardActionArea
			onClick={(e) => handleSelect(e)}
		>
				<WindowTopBar
					title={props.title}
					id={props.id}
					icon={props.icon}
					handleShow={handleShow}
					isChecked={w.isChecked}
				/></CardActionArea>
			{props.inner}
		</Card>
	)
})    