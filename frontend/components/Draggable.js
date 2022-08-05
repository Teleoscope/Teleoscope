// Draggable.js
import React, { useState } from "react";

// mui
import ShortTextIcon from '@mui/icons-material/ShortText';
import TopicIcon from '@mui/icons-material/Topic';
import FolderIcon from '@mui/icons-material/Folder';
import FlareIcon from '@mui/icons-material/Flare';
import CreateIcon from '@mui/icons-material/Create';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FolderCopyIcon from '@mui/icons-material/FolderCopy';

// custom
import Notes from "../components/Notes"
import FABMenu from "../components/FABMenu"
import Group from "../components/Group"
import Post from "../components/Post"
import Teleoscope from "../components/Teleoscope"
import Search from "../components/Search"
import GroupPalette from "../components/GroupPalette"
import Window from "../components/Window"

const WindowDefinitions = {
	"Note": {
		icon: <CreateIcon fontSize="inherit" />,
		component: (w, id) => { return(<Notes id={id} windata={w}/>)},
		showWindow: true,
		title: () => {return "Note"},
	},
	"FABMenu": {
		icon: <AddIcon fontSize="inherit" />,
		component: (w, id) => { return(<FABMenu id={id} windata={w}/>)},
		showWindow: false,
		title: () => {return "FABMenu"},
	},
	"Group": {
		icon: <TopicIcon fontSize="inherit" />,
		component: (w, id) => { return(<Group id={id} windata={w}/>)},
		showWindow: false,
		title: () => {return "Group"},
	},
	"Post": {
		icon: <ShortTextIcon fontSize="inherit" />,
		component: (w, id) => { return(<Post id={id} windata={w}/>)},
		showWindow: true,
		title: () => {return "Post"},
	},
	"Teleoscope": {
		icon: <FlareIcon fontSize="inherit" />,
		component: (w, id) => { return(<Teleoscope id={id} windata={w}/>)},
		showWindow: false,
		title: () => {return "Teleoscope"},
	},
	"Search": {
		icon: <SearchIcon fontSize="inherit" />,
		component: (w, id) => { return(<Search id={id} windata={w}/>)},
		showWindow: true,
		title: () => {return "Search"},
	},
	"Group Palette": {
		icon: <FolderCopyIcon fontSize="inherit" />,
		component: (w, id) => { return(<GroupPalette id={id} windata={w}/>)},
		showWindow: true,
		title: () => {return "Group Palette"},
	},
}

export default function Draggable(props) {
	const w = props.windata;
	if (w.type == "FABMenu") {
		return (
			<div>{WindowDefinitions[w.type].component(w, props.id)}</div>
		)
	}
	return (
		<Window {...props}
			icon={WindowDefinitions[w.type].icon}
			inner={WindowDefinitions[w.type].component(w, props.id)} 
			showWindow={WindowDefinitions[w.type].showWindow}
		/>
	)
}
