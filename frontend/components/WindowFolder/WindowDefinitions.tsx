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


import { CgPathIntersect, CgPathExclude } from 'react-icons/cg';
import { MdManageSearch } from 'react-icons/md';
import { RiBookmark3Line } from 'react-icons/ri';
import { BsStickies, BsSticky } from 'react-icons/bs';

import { IconContext } from "react-icons";

import WindowNode from "@/components/Nodes/WindowNode";
import OperationNode from "@/components/Nodes/OperationNode";
import SourceNode from "@/components/Nodes/SourceNode";
import TargetNode from "@/components/Nodes/TargetNode";


// custom
import Note from "@/components/Note";
import FABMenu from "@/components/FABMenu";
import Group from "@/components/Groups/Group";
import Document from "@/components/Documents/Document";
import Teleoscopes from "@/components/Teleoscopes";
import Teleoscope from "@/components/Teleoscope";
import Search from "@/components/Search";
import Groups from "@/components/Groups/Groups";
import Clusters from "@/components/Cluster/Clusters";
import Projection from "@/components/Cluster/Projection";
import ProjectionPalette from "@/components/Cluster/ProjectionPalette";
import Notes from "@/components/Notes";


import Filter from "@/components/Operations/Filter";
import Intersection from "@/components/Operations/Intersection";
import Exclusion from "@/components/Operations/Exclusion";
import Union from "@/components/Operations/Union";

import { PreprocessTitle } from "@/util/Preprocessers";

export default class WindowDefinitions {
  private color;

  public constructor (windowState) {
    this.color = windowState.settings.color;
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
      Note: {
        tag:       "note",
        type:      "Note",
        apipath:   "note",
        nodetype:  SourceNode,      
        title:     (d) => `Note: ${d?.history[0].label}`,
        color:     () => this.color,
        icon:      () => <IconContext.Provider value={{size: "1em", color: this.color}}><BsSticky /></IconContext.Provider>,
        component: (w, id, color) => <Note id={id} windata={w} color={color} />,
      },
      Notes: {
        tag:       "notes",
        type:      "Notes",
        apipath:   "notes",
        nodetype:  WindowNode,
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      () => <IconContext.Provider value={{size: "1em", color: this.color}}><BsStickies /></IconContext.Provider>,
        component: (w, id, color) => <Notes id={id} windata={w} color={color} />,
      },
      FABMenu: {
        tag:       "fabmenu",
        type:      "FABMenu",
        apipath:   "fabmenu",
        nodetype:  WindowNode,      
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      () => <AddIcon fontSize="inherit" />,
        component: (w, id, color) => <FABMenu id={id} windata={w} color={color} />,
      },
      Group: {
        tag:       "group",
        type:      "Group",
        apipath:   "groups",
        nodetype:  SourceNode,      
        title:     (d) => `Group: ${d?.history[0].label ? d?.history[0].label : "loading..."}`,
        color:     (d) => d?.history[0].color,
        icon:      (d) => <FolderIcon sx={{ color: d?.history[0].color }} fontSize="inherit"  />,
        component: (w, id, color) => <Group id={id} windata={w} color={color} />,
      },
      Document: {
        tag:       "document",
        type:      "Document",
        apipath:   "document",
        nodetype:  SourceNode,      
        title:     (d) => PreprocessTitle(d?.title),
        color:     () => this.color,
        icon:      () => <ShortTextIcon fontSize="inherit"  />,
        component: (w, id, color) => <Document id={id} windata={w} color={color} />,
      },
      Teleoscope: {
        tag:       "teleoscope",
        type:      "Teleoscope",
        apipath:   "graph",
        nodetype:  OperationNode,      
        title:     (d) => d?.type,
        color:     (d) => this.color,
        icon:      (d) => <FlareIcon sx={{ color: this.color }} fontSize="inherit" />,
        component: (w, id, color) => <Teleoscope id={id} windata={w} color={color} />,
      },
      Teleoscopes: {
        tag:       "teleoscopes",
        type:      "Teleoscopes",
        apipath:   "teleoscopes",
        nodetype:  WindowNode,      
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      () => <FlareIcon sx={this.style()} fontSize="inherit" />,
        component: (w, id, color) => <Teleoscopes id={id} windata={w} color={color} />,
      },
      Projection: {
        tag:       "projection",
        type:      "Projection",
        apipath:   "projections",
        nodetype:  TargetNode,      
        title:     (d) => `Projection: ${d?.history[0].label}`,
        color:     (d) => d?.history[0].color,
        icon:      (d) => <Diversity2Icon sx={{ color: d?.history[0].color }}  fontSize="inherit" />,
        component: (w, id, color) => <Projection id={id} windata={w} color={color} />,
      },
      Projections: {
        tag:       "projectionpalette", // projections?
        type:      "Projections",
        apipath:   "projections",
        nodetype:  WindowNode,      
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      () => <Diversity2Icon sx={this.style()} fontSize="inherit" />,
        component: (w, id, color) => <ProjectionPalette id={id} windata={w} color={color} />,
      },
      Search: {
        tag:       "search",
        type:      "Search",
        apipath:   "searches",
        nodetype:  SourceNode,  
        title:     (d) => d?.history[0].query ? `Search: ${d?.history[0].query}`: `Search`,
        color:     () => this.color,
        icon:      () => <SearchIcon sx={this.style()} fontSize="inherit" />,
        component: (w, id, color) => <Search id={id} windata={w} color={color} />,
      },
      Groups: {
        tag:       "groups",
        type:      "Groups",
        apipath:   "groups",
        nodetype:  WindowNode,      
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      () => <FolderCopyIcon sx={this.style()} fontSize="inherit" />,
        component: (w, id, color) => <Groups id={id} windata={w} color={color} />,
      },
      Clusters: {
        tag:       "clusters",
        type:      "Clusters",
        apipath:   "clusters",
        nodetype:  WindowNode,      
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      () => <Diversity2Icon sx={this.style()} fontSize="inherit" />,
        component: (w, id, color) => <Clusters id={id} windata={w} color={color} />,
      },
      Bookmarks: {
        tag:       "bookmarks",
        type:      "Bookmarks",
        apipath:   "bookmarks",
        nodetype:  WindowNode,      
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      () => <IconContext.Provider value={{size: "1em", color: this.color}}><RiBookmark3Line /></IconContext.Provider>,
        component: (w, id, color) => <Clusters id={id} windata={w} color={color} />,
      },
      Settings: {
        tag:       "settings",
        type:      "Settings",
        apipath:   "settings",
        nodetype:  WindowNode,      
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      () => <SettingsIcon sx={this.style()} fontSize="inherit" />,
        component: (w, id, color) => <Clusters id={id} windata={w} color={color} />,
      },
      Workflows: {
        tag:       "workflows",
        type:      "Workflows",
        apipath:   "workflows",
        nodetype:  WindowNode,
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      (sx = this.style()) => <AccountTreeIcon sx={sx} fontSize="inherit" />,
        component: (w, id, color) => <Clusters id={id} windata={w} color={color} />,
      },
      Operation: {
        tag:       "operation",
        type:      "Operation",
        apipath:   "operation",
        nodetype: OperationNode,
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      (sx = this.style()) => <AccountTreeIcon sx={sx} fontSize="inherit"  />,
        component: (w, id, color) => <Clusters id={id} windata={w} color={color} />,
      },
      Filter: {
        tag:       "filter",
        type:      "Filter",
        apipath:   "filter",
        nodetype: OperationNode,
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      (sx = this.style()) => <MdManageSearch />,
        component: (w, id, color) => <Filter id={id} windata={w} color={color} />,
      },
      Intersection: {
        tag:       "intersection",
        type:      "Intersection",
        apipath:   "intersection",
        nodetype: OperationNode,
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      (sx = this.style()) => <IconContext.Provider value={{size: "1em", color: this.color}}><CgPathIntersect /></IconContext.Provider>,
        component: (w, id, color) => <Intersection id={id} windata={w} color={color} />,
      },
      Exclusion: {
        tag:       "exclusion",
        type:      "Exclusion",
        apipath:   "exclusion",
        nodetype: OperationNode,
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      (sx = this.style()) => <IconContext.Provider value={{size: "1em", color: this.color}}><CgPathExclude /></IconContext.Provider>,
        component: (w, id, color) => <Exclusion id={id} windata={w} color={color} />,
      },
      Union: {
        tag:       "union",
        type:      "Union",
        apipath:   "union",
        nodetype: OperationNode,
        title:     function () {return this.type},
        color:     () => this.color,
        icon:      (sx = this.style()) => <IconContext.Provider value={{size: "1em", color: this.color}}><CgPathIntersect /></IconContext.Provider>,
        component: (w, id, color) => <Union id={id} windata={w} color={color} />,
      },
    };
  
    // Backwards compatibility
    config["Group Palette"] = config.Groups;
    config["Teleoscope Palette"] = config.Teleoscopes;
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
      search: "searches",
      searches: "searches",
      groups: "groups",
      operation: "operation",
      intersection: "intersection",
      ...this.paths()
    };
  }

}






