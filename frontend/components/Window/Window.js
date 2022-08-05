// Window.js
import React, { useState } from "react";

// custom
import FABMenu from "../FABMenu"
import Notes from "../WindowModules/Notes"
import Teleoscope from "../WindowModules/Teleoscope"
import Search from "../WindowModules/Search";
import GroupPalette from "../WindowModules/GroupPalette";
import Group from "../Group";
import Post from "../Post";
import WorkspaceItem from "../WorkspaceItem";
import CloseButton from "../CloseButton";
import WindowTopBar from "../WindowTopBar";

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
import { checker } from "../../actions/checkedPosts";
import { useSelector, useDispatch } from "react-redux";
import { WindowHeader } from "./WindowHeader";
import { WindowBody } from "./WindowBody";
import { minimizeWindow, maximizeWindow, checkWindow } from "../../actions/windows";

// util
import useSWRAbstract from "../../util/swr"
import { PreprocessTitle, PreprocessText } from "../../util/Preprocessers"

const innerContent = (type, id, props) => {
	if (type == "Teleoscope") {
		return <Teleoscope id={id}></Teleoscope>
	}
	if (type == "GroupPalette") {
		return <GroupPalette id={id}></GroupPalette>
	}
	if (type == "Group") {
		return <Group id={id}></Group>
	}
	if (type == "Search") {
		return <Search id={id}></Search>
	}
	if (type == "Note") {
		return <Notes id={id}></Notes>
	}
	if (type == "Post") {
		return <WorkspaceItem id={id}></WorkspaceItem>
	}
}

const WindowModule = ({ component }, id) => {
	const Module = component;
	return (
		<Module id={id} />
	)
}

const button_style = {
	fontSize: 15,
	color: "white",
	marginBottom: "0.15em",
	padding: "0",
	cursor: "pointer"
}

export default React.forwardRef(({ style, className, onMouseDown, onMouseUp, onTouchEnd, ...props }, ref) => {
	const [show, setShow] = useState(props.showWindow);
	const [drag, setDrag] = useState(true);
	const w = props.windata;
	const { post } = useSWRAbstract("post", `/api/posts/${w.i.split("%")[0]}`);
	const title = post ? PreprocessTitle(post.title) : "Not loading...";
	const dispatch = useDispatch();

	const handleMove = (e) => {
		if (e.buttons == 1) {
			setDrag(true);
		} else {
			setDrag(false);
		}
	}

	const handleSelect = (e) => {
		console.log("handleSelect", e)
		if (e.shiftKey) {
			dispatch(checkWindow({ i: w.i, check: !w.isChecked }))
		}
	}

	const handleShow = () => {
		if (show) {
			// dispatch(minimizeWindow(props.id));
			setShow(false);
		}
		if (!show && !drag) {
			// dispatch(maximizeWindow(props.id));
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
				height: "100%",
			}}
			sx={{
				boxShadow: '1',
			}}>

			<CardActionArea
				onClick={(e) => handleSelect(e)}>
				{/* <div
				style={{ backgroundColor: "#475c6c", height: "1em", cursor: "move" }}
				className="drag-handle"
			>

				<MaximizeButton sx={button_style} id={w.i} />
				<MinimizeButton sx={button_style} id={w.i} />
				<CloseButton sx={button_style} id={w.i} />
			</div>

			<WindowHeader>
				<WindowModule component={innerContent(w.type, w.i, props)} id="header" />
			</WindowHeader>

			<WindowBody>
				<WindowModule component={innerContent(w.type, w.i, props)} id="body" />
			</WindowBody>


			<div
				style={{
					backgroundColor: "#CCCCCC",
					height: "1em",
					width: "100%",
					position: "fixed",
					left: "0em",
					bottom: "0em",
					zIndex: 1,
					cursor: "move",
					...props.style
				}}
				className="drag-handle"
				{...props}
			></div> */}
				<WindowTopBar
					title={w.type == "Post" ? title : w.type}
					id={props.id}
					icon={props.icon}
					handleShow={handleShow}
					isChecked={w.isChecked}
				/>
			</CardActionArea>
			{props.inner}
			{console.log(props.inner)}
		</Card>
	)
})    