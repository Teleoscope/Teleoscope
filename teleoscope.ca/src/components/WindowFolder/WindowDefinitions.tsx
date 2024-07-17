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
import { AppState } from "@/services/app";
import DataHandler from "../Sidebar/DataHandler";

export default class WindowDefinitions {
  private color;

  public constructor (appState: AppState) {
    this.color = appState.workflow.settings.color;
  }

  private style() {
    return [
      { color: this.color },
      { "& .MuiChip-icon": 
        { color: this.color } 
      },
    ];
  } 

  public definitions() {
    const config = {
      Data: {
        tag:       "data",
        type:      "Data",
        apipath:   "data",
        nodetype:  SourceNode,      
        title:     (d) => `Data`,
        color:     () => this.color,
        icon:      () => <IconContext.Provider value={{size: "1em", color: this.color}}><FiUpload style={{ display: "inline" }} /></IconContext.Provider>,
        component: (w, id: string, color: string) => <DataHandler/>,
      },
      Note: {
        tag:       "note",
        type:      "Note",
        apipath:   "note",
        nodetype:  SourceNode,      
        title:     (d) => `Note: ${d?.label}`,
        color:     () => this.color,
        icon:      () => <IconContext.Provider value={{size: "1em", color: this.color}}><BsSticky style={{ display: "inline" }} /></IconContext.Provider>,
        component: (w, id: string, color: string) => <Note id={id} windata={w} color={color} />,
      },
      Notes: {
        tag:       "notes",
        type:      "Notes",
        apipath:   "notes",
        nodetype:  WindowNode,
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      () => <IconContext.Provider value={{size: "1em", color: this.color}}><BsStickies style={{ display: "inline" }} /></IconContext.Provider>,
        component: (w, id: string, color: string) => <Notes id={id} windata={w} color={color} />,
      },
      FABMenu: {
        tag:       "fabmenu",
        type:      "FABMenu",
        apipath:   "fabmenu",
        nodetype:  WindowNode,      
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      () => <AddIcon fontSize="inherit" />,
        component: (w, id: string, color: string) => <FABMenu id={id} windata={w} color={color} />,
      },
      Group: {
        tag:       "group",
        type:      "Group",
        apipath:   "group",
        nodetype:  SourceNode,      
        title:     (d) => `Group: ${d?.label ? d?.label : "loading..."}`,
        color:     (d) => d ? d?.color : this.color,
        icon:      (d) => <FolderIcon sx={{ color: d ? d?.color : this.color  }} fontSize="inherit"  />,
        component: (w, id: string, color: string) => <Group id={id} windata={w} color={color} />,
      },
      Document: {
        tag:       "document",
        type:      "Document",
        apipath:   "document",
        nodetype:  SourceNode,      
        title:     (d) => preprocessTitle(d?.title),
        color:     () => this.color,
        icon:      () => <ShortTextIcon fontSize="inherit"  />,
        component: (w, id: string, color: string) => <Document id={id} windata={w} color={color} />,
      },
      Rank: {
        tag:       "rank",
        type:      "Rank",
        apipath:   "graph",
        nodetype:  TargetNode,      
        title:     (d) => "Rank",
        color:     (d) => this.color,
        icon:      (d) => <IconContext.Provider value={{size: "1em", color: this.color}}><HiSortDescending style={{ display: "inline" }} /></IconContext.Provider>,
        component: (w, id: string, color: string) => <Rank id={id} windata={w} color={color} />,
      },
      Cluster: {
        tag:       "cluster",
        type:      "Cluster",
        apipath:   "graph",
        nodetype:  WindowNode,
        title:     (d) => `Cluster`,
        color:     () => this.color,
        icon:      () => <FlareIcon sx={this.style()} fontSize="inherit" />,
        component: (w, id: string, color: string) => <Group id={id} windata={w} color={color} />,
      },
      Projection: {
        tag:       "projection",
        type:      "Projection",
        apipath:   "graph",
        nodetype:  TargetNode,      
        title:     (d) => d?.type,
        color:     (d) => this.color,
        icon:      (d) => <Diversity2Icon sx={{ color: this.color }}  fontSize="inherit" />,
        component: (w, id: string, color: string) => <Projection id={id} windata={w} color={color} />,
      },
      Projections: {
        tag:       "projectionpalette", // projections?
        type:      "Projections",
        apipath:   "projections",
        nodetype:  WindowNode,      
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      () => <Diversity2Icon sx={this.style()} fontSize="inherit" />,
        component: (w, id: string, color: string) => <ProjectionPalette id={id} windata={w} color={color} />,
      },
      Search: {
        tag:       "search",
        type:      "Search",
        apipath:   "search",
        nodetype:  SourceNode,  
        title:     (d) => d?.query ? `Search: ${d?.query}`: `Search`,
        color:     () => this.color,
        icon:      () => <SearchIcon sx={this.style()} fontSize="inherit" />,
        component: (w, id: string, color: string) => <Search id={id} windata={w} color={color} />,
      },
      Groups: {
        tag:       "groups",
        type:      "Groups",
        apipath:   "groups",
        nodetype:  WindowNode,      
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      () => <FolderCopyIcon sx={this.style()} fontSize="inherit" />,
        component: (w, id: string, color: string) => <Groups id={id} windata={w} color={color} />,
      },
      Clusters: {
        tag:       "clusters",
        type:      "Clusters",
        apipath:   "clusters",
        nodetype:  WindowNode,      
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      () => <Diversity2Icon sx={this.style()} fontSize="inherit" />,
        component: (w, id: string, color: string) => <Clusters id={id} windata={w} color={color} />,
      },
      Bookmarks: {
        tag:       "bookmarks",
        type:      "Bookmarks",
        apipath:   "bookmarks",
        nodetype:  WindowNode,      
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      () => <IconContext.Provider value={{size: "1em", color: this.color}}><RiBookmark3Line style={{ display: "inline" }} /></IconContext.Provider>,
        component: (w, id: string, color: string) => <Bookmarks id={id} windata={w} color={color} />,
      },
      Settings: {
        tag:       "settings",
        type:      "Settings",
        apipath:   "settings",
        nodetype:  WindowNode,      
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      () => <SettingsIcon sx={this.style()} fontSize="inherit" />,
        component: (w, id: string, color: string) => <Clusters id={id} windata={w} color={color} />,
      },
      Workflows: {
        tag:       "workflows",
        type:      "Workflows",
        apipath:   "workflows",
        nodetype:  WindowNode,
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      (sx = this.style()) => <AccountTreeIcon sx={sx} fontSize="inherit" />,
        component: (w, id: string, color: string) => <Clusters id={id} windata={w} color={color} />,
      },
      Operation: {
        tag:       "operation",
        type:      "Operation",
        apipath:   "operation",
        nodetype: OperationNode,
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      (sx = this.style()) => <AccountTreeIcon sx={sx} fontSize="inherit"  />,
        component: (w, id: string, color: string) => <Clusters id={id} windata={w} color={color} />,
      },
      Difference: {
        tag:       "difference",
        type:      "Difference",
        apipath:   "graph",
        nodetype: OperationNode,
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      (sx = this.style()) => <IconContext.Provider value={{size: "1em", color: this.color}}><CgPathFront style={{ display: "inline" }} /></IconContext.Provider>,
        component: (w, id: string, color: string) => <Difference id={id} windata={w} color={color} />,
      },
      Intersection: {
        tag:       "intersection",
        type:      "Intersection",
        apipath:   "graph",
        nodetype: OperationNode,
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      (sx = this.style()) => <IconContext.Provider value={{size: "1em", color: this.color}}><CgPathIntersect style={{ display: "inline" }} /></IconContext.Provider>,
        component: (w, id: string, color: string) => <Intersection id={id} windata={w} color={color} />,
      },
      Exclusion: {
        tag:       "exclusion",
        type:      "Exclusion",
        apipath:   "graph",
        nodetype: OperationNode,
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      (sx = this.style()) => <IconContext.Provider value={{size: "1em", color: this.color}}><CgPathExclude style={{ display: "inline" }} /></IconContext.Provider>,
        component: (w, id: string, color: string) => <Exclusion id={id} windata={w} color={color} />,
      },
      Union: {
        tag:       "union",
        type:      "Union",
        apipath:   "graph",
        nodetype: OperationNode,
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      (sx = this.style()) => <IconContext.Provider value={{size: "1em", color: this.color}}><CgPathUnite style={{ display: "inline" }} /></IconContext.Provider>,
        component: (w, id: string, color: string) => <Union id={id} windata={w} color={color} />,
      },
    };
  
    // Backwards compatibility
    config["Group Palette"] = config.Groups;
    config["Note Palette"] = config.Notes;
    config["Settings Palette"] = config.Settings;
    config["Workflow Palette"] = config.Workflows;
  
    return config;
  }
  
  public nodeTypeDefs() {
    return Object.entries(this.definitions()).reduce((obj, [w, def]) => {
      obj[w] = def.nodetype;
      return obj;
    }, {})
  } 

  public paths() {
    return Object.entries(this.definitions()).reduce((obj, [w, def]) => {
      obj[w] = def.apipath;
      return obj;
    }, {}) 
  }

  public getAPIRoute(str) {
    const keymap = this.apikeymap()
    return keymap[str]
  }

  public apikeymap() {
    return {
      note: "note",
      notes: "notes",
      notepalette: "notes",
      fabmenu: "fabmenu",
      group: "groups",
      grouppalette: "groups",
      document: "document",
      teleoscope: "teleoscopes",
      teleoscopes: "teleoscopes",
      teleoscopepalette: "teleoscopes",
      projection: "projections",
      projectionpalette: "projectionpalette",
      clusters: "clusters",
      search: "search",
      searches: "search",
      groups: "groups",
      operation: "operation",
      intersection: "intersection",
      ...this.paths()
    };
  }

}






