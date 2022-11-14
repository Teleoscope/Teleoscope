import React from 'react'

// mui
import ShortTextIcon from '@mui/icons-material/ShortText';
import TopicIcon from '@mui/icons-material/Topic';
import FlareIcon from '@mui/icons-material/Flare';
import CreateIcon from '@mui/icons-material/Create';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
import Diversity2Icon from '@mui/icons-material/Diversity2';

// custom
import Notes from "../WindowModules/Notes"
import FABMenu from "../FABMenu"
import Group from "../Group"
import Post from "../Posts/Post"
import TeleoscopePalette from "../TeleoscopePalette"
import Teleoscope from "../Teleoscope"
import Search from "../WindowModules/Search"
import GroupPalette from "../WindowModules/GroupPalette"
import Clusters from "../Cluster/Clusters"
import Cluster from '../Cluster/Cluster';

import { PreprocessTitle, PreprocessText } from "../../util/Preprocessers"

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
			color: () => { return "#4e5bc"},
			tag: "fabmenu",
		},
		"Group": {
			icon: (d) => { return (<TopicIcon fontSize="inherit" sx={{ color: d?.history[0].color }} />) },
			component: (w, id) => { return (<Group id={id} windata={w} />) },
			showWindow: false,
			title: (d) => { return d?.history[0].label },
			color: (d) => { return d?.history[0].color },
			tag: "group",
		},
		"Post": {
			icon: () => { return <ShortTextIcon fontSize="inherit" /> },
			component: (w, id) => { return (<Post id={id} windata={w} />) },
			showWindow: true,
			title: (d) => { return PreprocessTitle(d?.title) },
			color: () => { return "#4e5cbc"},
			tag: "post",
		},
		"Teleoscope": {
			icon: () => { return <FlareIcon fontSize="inherit" /> },
			component: (w, id) => { return (<Teleoscope id={id} windata={w} />) },
			showWindow: false,
			title: (d) => { return `${d?.history[0].label}` },
			color: () => { return "#4e5cbc"},
			tag: "teleoscope",
		},
		"Teleoscope Palette": {
			icon: () => { return <FlareIcon fontSize="inherit" /> },
			component: (w, id) => { return (<TeleoscopePalette id={id} windata={w} />) },
			showWindow: false,
			title: () => { return `Teleoscopes` },
			color: () => { return "#4e5cbc"},
			tag: "teleoscope",
		},
		"Search": {
			icon: () => { return <SearchIcon fontSize="inherit" /> },
			component: (w, id) => { return (<Search id={id} windata={w} />) },
			showWindow: true,
			title: () => { return "Search" },
			color: () => { return "#4e5cbc"},
			tag: "search",
		},
		"Group Palette": {
			icon: () => { return <FolderCopyIcon fontSize="inherit" /> },
			component: (w, id) => { return (<GroupPalette id={id} windata={w} />) },
			showWindow: true,
			title: () => { return "Group Palette" },
			color: () => { return "#4e5cbc"},
			tag: "grouppalette",
		},
		"Clusters": {
			icon: () => { return <Diversity2Icon fontSize="inherit" /> },
			component: (w, id) => { return (<Clusters id={id} windata={w} />) },
			showWindow: true,
			title: () => { return "Clusters" },
			color: () => { return "#4e5cbc"},
			tag: "clusters",
		},
		"Cluster": {
			icon: (d) => { return (<TopicIcon fontSize="inherit" sx={{ color: d?.history[0].color }} />) },
			component: (w, id) => { return (<Cluster id={id} windata={w} />) },
			showWindow: false,
			title: (d) => { return d?.history[0].label },
			color: (d) => { return d?.history[0].color },
			tag: "cluster",
		},
	}
}