// Window.js
import React, { useState } from "react";

// custom
import WindowTopBar from "../components/WindowTopBar";

// mui
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';

import Paper from '@mui/material/Paper';
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import TopicIcon from '@mui/icons-material/Topic';

// actions
import { useSelector, useDispatch } from "react-redux";
import { minimizeWindow, maximizeWindow, checkWindow } from "../actions/windows";

// util
import useSWRAbstract from "../util/swr"
import { PreprocessTitle, PreprocessText } from "../util/Preprocessers"


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
			dispatch(checkWindow({i: w.i, check: !w.isChecked}))	
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

  	if (!show) {
  		return (
  			<IconButton
  				onClick={handleShow}
  				className="drag-handle"
  				onMouseMove={(e) => handleMove(e)}
  				style={{
  					backgroundColor: "white",
  					cursor: "move",            		
  				}}
				sx={{
					border: w.isChecked ? "2px solid #4e5cbc" : "1px solid #DDDDDD",
            		boxShadow: '1',
         		}}
  			>{props.icon}</IconButton>
  		)
  	}

	return (
		<Card
			variant="outlined"
			style={{
				borderColor: w.isChecked ? "#4e5cbc" : "#DDDDDD",
            	borderWidth: w.isChecked ? 2 : 1,
            	backgroundColor: "white",
            	height:"100%",
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