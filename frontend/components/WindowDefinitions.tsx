import React from 'react'

// mui
import ShortTextIcon from '@mui/icons-material/ShortText';
import TopicIcon from '@mui/icons-material/Topic';
import FlareIcon from '@mui/icons-material/Flare';
import CreateIcon from '@mui/icons-material/Create';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FolderCopyIcon from '@mui/icons-material/FolderCopy';

// custom
import Notes from "./Notes"
import FABMenu from "./FABMenu"
import Group from "./Group"
import Post from "./Post"
import Teleoscope from "./Teleoscope"
import Search from "./Search"
import GroupPalette from "./GroupPalette"

import { PreprocessTitle, PreprocessText } from "../util/Preprocessers"

export default function WindowDefinitions() {
	return {
		"Note": {
			icon: () => { return <CreateIcon fontSize="inherit" /> },
			component: (w, id) => { return (<Notes id={id} windata={w} />) },
			showWindow: true,
			title: () => { return "Note" },
			tag: "note",
		},
		"FABMenu": {
			icon: () => { return <AddIcon fontSize="inherit" /> },
			component: (w, id) => { return (<FABMenu id={id} windata={w} />) },
			showWindow: false,
			title: () => { return "FABMenu" },
			tag: "fabmenu",
		},
		"Group": {
			icon: (d) => { return (<TopicIcon fontSize="inherit" sx={{ color: d?.history[0].color }} />) },
			component: (w, id) => { return (<Group id={id} windata={w} />) },
			showWindow: false,
			title: (d) => { return d?.history[0].label },
			tag: "group",
		},
		"Post": {
			icon: () => { return <ShortTextIcon fontSize="inherit" /> },
			component: (w, id) => { return (<Post id={id} windata={w} />) },
			showWindow: true,
			title: (d) => { return PreprocessTitle(d?.title) },
			tag: "post",
		},
		"Teleoscope": {
			icon: () => { return <FlareIcon fontSize="inherit" /> },
			component: (w, id) => { return (<Teleoscope id={id} windata={w} />) },
			showWindow: false,
			title: () => { return "Teleoscope" },
			tag: "teleoscope",
		},
		"Search": {
			icon: () => { return <SearchIcon fontSize="inherit" /> },
			component: (w, id) => { return (<Search id={id} windata={w} />) },
			showWindow: true,
			title: () => { return "Search" },
			tag: "search",
		},
		"Group Palette": {
			icon: () => { return <FolderCopyIcon fontSize="inherit" /> },
			component: (w, id) => { return (<GroupPalette id={id} windata={w} />) },
			showWindow: true,
			title: () => { return "Group Palette" },
			tag: "grouppalette",
		},
	}
}