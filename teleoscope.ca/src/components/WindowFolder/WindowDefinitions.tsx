// mui
import ShortTextIcon from "@mui/icons-material/ShortText";
import FlareIcon from "@mui/icons-material/Flare";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import FolderCopyIcon from "@mui/icons-material/FolderCopy";
import Diversity2Icon from "@mui/icons-material/Diversity2";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import FolderIcon from "@mui/icons-material/Folder";

import { CgPathIntersect, CgPathExclude, CgPathFront, CgPathUnite } from 'react-icons/cg';
import { RiBookmark3Line } from 'react-icons/ri';
import { BsStickies, BsSticky } from 'react-icons/bs';
import { HiSortDescending } from "react-icons/hi";
import { FiUpload } from "react-icons/fi";
import { FaDatabase } from "react-icons/fa";

import { IconContext } from "react-icons";

import WindowNode from "@/components/Nodes/WindowNode";
import OperationNode from "@/components/Nodes/OperationNode";
import TargetNode from "@/components/Nodes/TargetNode";
import SourceNode from "@/components/Nodes/SourceNode";


// custom
import Note from "@/components/Notes/Note";
import FABMenu from "@/components/FABMenu";
import Group from "@/components/Groups/Group";
import Document from "@/components/Documents/Document";
import Rank from "@/components/Rank";
import Search from "@/components/Search";
import Groups from "@/components/Groups/Groups";
import Clusters from "@/components/Cluster/Clusters";
import Projection from "@/components/Cluster/Projection";
import ProjectionPalette from "@/components/Cluster/ProjectionPalette";
import Notes from "@/components/Notes/Notes";
import Intersection from "@/components/Operations/Intersection";
import Exclusion from "@/components/Operations/Exclusion";
import Union from "@/components/Operations/Union";
import Difference from "@/components/Operations/Difference";

import { preprocessTitle } from "@/lib/preprocessers";
import Bookmarks from "@/components/Bookmarks";
import DataHandler from "../Sidebar/DataHandler";
import { WindowProps } from "./WindowFactory";
import { Component } from "react";
import SetOperation from "../Operations/SetOperation";
import Storage from "../Storage";

const style = (c: string) => [
  { color: c },
  { "& .MuiChip-icon": 
    { color: c } 
  },
];


interface Window {
  type: string,
  apipath: string,
  nodetype: typeof SourceNode | typeof WindowNode | typeof OperationNode | typeof BaseNode,
  title: string,
  icon: Component,
  component: Component
}

export const WindowConfig = {
  Data: {
    type:      "Data",
    apipath:   "data",
    nodetype:  SourceNode,      
    title:     (d) => `Data`,
    icon:      (c: string) => <IconContext.Provider value={{size: "1em", color: c}}><FiUpload style={{ display: "inline" }} /></IconContext.Provider>,
    component: (props: WindowProps) => <DataHandler/>,
  },
  Note: {
    type:      "Note",
    apipath:   "note",
    nodetype:  SourceNode,      
    title:     (d) => `Note: ${d?.label}`,
    icon:      (c: string) => <IconContext.Provider value={{size: "1em", color: c}}><BsSticky style={{ display: "inline" }} /></IconContext.Provider>,
    component: (props: WindowProps) => <Note {...props} />,
  },
  Notes: {
    type:      "Notes",
    apipath:   "notes",
    nodetype:  WindowNode,
    title:     function () {return this.type},
    icon:      (c: string) => <IconContext.Provider value={{size: "1em", color: c}}><BsStickies style={{ display: "inline" }} /></IconContext.Provider>,
    component: (props: WindowProps) => <Notes />,
  },
  FABMenu: {
    type:      "FABMenu",
    apipath:   "fabmenu",
    nodetype:  WindowNode,      
    title:     function () {return this.type},
    icon:      (c: string) => <AddIcon fontSize="inherit" />,
    component: (props: WindowProps) => <FABMenu {...props} />,
  },
  Group: {
    type:      "Group",
    apipath:   "group",
    nodetype:  SourceNode,      
    title:     (d) => `Group: ${d?.label ? d?.label : "loading..."}`,
    color:     (d) => d ? d?.color : color,
    icon:      (c: string) => <FolderIcon sx={{ color: c  }} fontSize="inherit"  />,
    component: (props: WindowProps) => <Group {...props} />,
  },
  Document: {
    type:      "Document",
    apipath:   "document",
    nodetype:  SourceNode,      
    title:     (d) => preprocessTitle(d?.title),
    icon:      (c: string) => <ShortTextIcon fontSize="inherit"  />,
    component: (props: WindowProps) => <Document {...props} />,
  },
  Rank: {
    type:      "Rank",
    apipath:   "graph",
    nodetype:  TargetNode,      
    title:     (d) => "Rank",
    icon:      (c: string) => <IconContext.Provider value={{size: "1em", color: c}}><HiSortDescending style={{ display: "inline" }} /></IconContext.Provider>,
    component: (props: WindowProps) => <Rank {...props} />,
  },
  Cluster: {
    type:      "Cluster",
    apipath:   "graph",
    nodetype:  WindowNode,
    title:     (d) => `Cluster`,
    icon:      (c: string) => <FlareIcon sx={style(c)} fontSize="inherit" />,
    component: (props: WindowProps) => <Group {...props} />,
  },
  Projection: {
    type:      "Projection",
    apipath:   "graph",
    nodetype:  TargetNode,      
    title:     (d) => `Projection`,
    icon:      (c: string) => <Diversity2Icon sx={{ color: c }}  fontSize="inherit" />,
    component: (props: WindowProps) => <Projection {...props} />,
  },
  Projections: {
    type:      "Projections",
    apipath:   "projections",
    nodetype:  WindowNode,      
    title:     function () {return this.type},
    icon:      (c: string) => <Diversity2Icon sx={style(c)} fontSize="inherit" />,
    component: (props: WindowProps) => <ProjectionPalette {...props} />,
  },
  Search: {
    type:      "Search",
    apipath:   "search",
    nodetype:  SourceNode,  
    title:     (d) => d?.query ? `Search: ${d?.query}`: `Search`,
    icon:      (c: string) => <SearchIcon sx={style(c)} fontSize="inherit" />,
    component: (props: WindowProps) => <Search {...props} />,
  },
  Groups: {
    type:      "Groups",
    apipath:   "groups",
    nodetype:  WindowNode,      
    title:     function () {return this.type},
    icon:      (c: string) => <FolderCopyIcon sx={style(c)} fontSize="inherit" />,
    component: (props: WindowProps) => <Groups {...props} />,
  },
  Clusters: {
    type:      "Clusters",
    apipath:   "clusters",
    nodetype:  WindowNode,      
    title:     function () {return this.type},
    icon:      (c: string) => <Diversity2Icon sx={style(c)} fontSize="inherit" />,
    component: (props: WindowProps) => <Clusters {...props} />,
  },
  Bookmarks: {
    type:      "Bookmarks",
    apipath:   "bookmarks",
    nodetype:  WindowNode,      
    title:     function () {return this.type},
    icon:      (c: string) => <IconContext.Provider value={{size: "1em", color: c}}><RiBookmark3Line style={{ display: "inline" }} /></IconContext.Provider>,
    component: (props: WindowProps) => <Bookmarks />,
  },
  Settings: {
    type:      "Settings",
    apipath:   "settings",
    nodetype:  WindowNode,      
    title:     function () {return this.type},
    icon:      (c: string) => <SettingsIcon sx={style(c)} fontSize="inherit" />,
    component: (props: WindowProps) => <Clusters {...props} />,
  },
  Workflows: {
    type:      "Workflows",
    apipath:   "workflows",
    nodetype:  WindowNode,
    title:     function () {return this.type},
    icon:      (c: string) => <AccountTreeIcon sx={style(c)} fontSize="inherit" />,
    component: (props: WindowProps) => <Clusters {...props} />,
  },
  Operation: {
    type:      "Operation",
    apipath:   "operation",
    nodetype: OperationNode,
    title:     function () {return this.type},
    icon:      (c: string) => <AccountTreeIcon sx={style(c)} fontSize="inherit"  />,
    component: (props: WindowProps) => <Clusters {...props} />,
  },
  Difference: {
    type:      "Difference",
    apipath:   "graph",
    nodetype: OperationNode,
    title:     function () {return this.type},
    icon:      (c: string) => <IconContext.Provider value={{size: "1em", color: c}}><CgPathFront style={{ display: "inline" }} /></IconContext.Provider>,
    component: (props: WindowProps) => <Difference {...props} />,
  },
  Intersection: {
    type:      "Intersection",
    apipath:   "graph",
    nodetype: OperationNode,
    title:     function () {return this.type},
    icon:      (c: string) => <IconContext.Provider value={{size: "1em", color: c}}><CgPathIntersect style={{ display: "inline" }} /></IconContext.Provider>,
    component: (props: WindowProps) => <Intersection {...props} />,
  },
  Exclusion: {
    type:      "Exclusion",
    apipath:   "graph",
    nodetype: OperationNode,
    title:     function () {return this.type},
    icon:      (c: string) => <IconContext.Provider value={{size: "1em", color: c}}><CgPathExclude style={{ display: "inline" }} /></IconContext.Provider>,
    component: (props: WindowProps) => <Exclusion {...props} />,
  },
  Union: {
    type:      "Union",
    apipath:   "graph",
    nodetype: OperationNode,
    title:     function () {return this.type},
    icon:      (c: string) => <IconContext.Provider value={{size: "1em", color: c}}><CgPathUnite style={{ display: "inline" }} /></IconContext.Provider>,
    component: (props: WindowProps) => <Union {...props} />,
  },
  Storage: {
    type:      "Storage",
    apipath:   "storage",
    nodetype:  SourceNode,
    title:     (d) => `${d?.label ? d?.label : "loading..."}`,
    icon:      (c: string) => <IconContext.Provider value={{size: "1em", color: c}}><FaDatabase style={{ display: "inline" }} /></IconContext.Provider>,
    component: (props: WindowProps) => <Storage {...props} />,
  },
  All: {
    type:      "All",
    apipath:   "graph",
    nodetype: OperationNode,
    title:     function () {return this.type},
    icon:      (c: string) => <IconContext.Provider value={{size: "1em", color: c}}><CgPathUnite style={{ display: "inline" }} /></IconContext.Provider>,
    component: (props: WindowProps) => <Union {...props} />,
  },
  undefined: {
    type:      "boop",
    apipath:   "blip",
    nodetype: OperationNode,
    title:     function () {return this.type},
    icon:      (c: string) => <IconContext.Provider value={{size: "1em", color: c}}><CgPathUnite style={{ display: "inline" }} /></IconContext.Provider>,
    component: (props: WindowProps) => <SetOperation {...props} />,
  },
}

export type WindowConfigType = typeof WindowConfig.undefined;

export default function WindowDefinitions(type: string): Window {
  
  // Check if the type exists in the baseConfig
  if (!WindowConfig[type]) {
    throw new Error(`Type '${type}' not found in config`);
  }

  // Dynamically generate the configuration based on the type
  const config = {
    ...WindowConfig[type],
    color: () => color,
  };

  // Return the generated configuration
  return config;
}