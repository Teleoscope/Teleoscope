import React from "react";

// mui
import ShortTextIcon from "@mui/icons-material/ShortText";
import TopicIcon from "@mui/icons-material/Topic";
import FlareIcon from "@mui/icons-material/Flare";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import FolderCopyIcon from "@mui/icons-material/FolderCopy";
import Diversity2Icon from "@mui/icons-material/Diversity2";
import CommentIcon from "@mui/icons-material/Comment";
import StarIcon from "@mui/icons-material/Star";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountTreeIcon from "@mui/icons-material/AccountTree";

import { CgPathIntersect, CgPathExclude, CgPathUnite } from 'react-icons/cg';

import WindowNode from "@/components/Nodes/WindowNode";
import OperationNode from "@/components/Nodes/OperationNode";
import SourceNode from "@/components/Nodes/SourceNode";
import TargetNode from "@/components/Nodes/TargetNode";

// custom
import Note from "@/components/Note";
import FABMenu from "@/components/FABMenu";
import Group from "@/components/Group";
import Document from "@/components/Documents/Document";
import Teleoscopes from "@/components/Teleoscopes";
import Teleoscope from "@/components/Teleoscope";
import Search from "@/components/Search";
import Groups from "@/components/Groups";
import Clusters from "@/components/Cluster/Clusters";
import Cluster from "@/components/Cluster/Cluster";
import Projection from "@/components/Cluster/Projection";
import ProjectionPalette from "@/components/Cluster/ProjectionPalette";
import Notes from "@/components/Notes";
import Intersection from "@/components/Operations/Intersection";
import Exclusion from "@/components/Operations/Exclusion";
import Union from "@/components/Operations/Union";

import { PreprocessTitle } from "@/util/Preprocessers";

export default function WindowDefinitions(windowState) {
  const color = windowState.settings.color;

  const style = [
    { color: color },
  { "& .MuiChip-icon": { color: color } },
  ];

  const config = {
    Note: {
      tag:       "note",
      type:      "Note",
      apipath:   "note",
      nodetype:  SourceNode,      
      title:     (d) => `${d?.history[0].label}`,
      color:     () => color,
      icon:      () => <CommentIcon fontSize="inherit" />,
      component: (w, id, color) => <Note id={id} windata={w} color={color} />,
    },
    Notes: {
      tag:       "notes",
      type:      "Notes",
      apipath:   "notes",
      nodetype:  WindowNode,
      title:     function () {return this.type},
      color:     () => color,
      icon:      () => <CommentIcon fontSize="inherit" sx={style} />,
      component: (w, id, color) => <Notes id={id} windata={w} color={color} />,
    },
    FABMenu: {
      tag:       "fabmenu",
      type:      "FABMenu",
      apipath:   "fabmenu",
      nodetype:  WindowNode,      
      title:     function () {return this.type},
      color:     () => color,
      icon:      () => <AddIcon fontSize="inherit" />,
      component: (w, id, color) => <FABMenu id={id} windata={w} color={color} />,
    },
    Group: {
      tag:       "group",
      type:      "Group",
      apipath:   "groups",
      nodetype:  SourceNode,      
      title:     (d) => `Group: ${d?.history[0].label}`,
      color:     (d) => d?.history[0].color,
      icon:      (d) => <TopicIcon fontSize="inherit" sx={{ color: d?.history[0].color }} />,
      component: (w, id, color) => <Group id={id} windata={w} color={color} />,
    },
    Document: {
      tag:       "document",
      type:      "Document",
      apipath:   "document",
      nodetype:  SourceNode,      
      title:     (d) => PreprocessTitle(d?.title),
      color:     () => color,
      icon:      () => <ShortTextIcon fontSize="inherit" />,
      component: (w, id, color) => <Document id={id} windata={w} color={color} />,
    },
    Teleoscope: {
      tag:       "teleoscope",
      type:      "Teleoscope",
      apipath:   "teleoscopes",
      nodetype:  TargetNode,      
      title:     (d) => `Teleoscope: ${d?.history[0].label}`,
      color:     (d) => d?.history[0].color,
      icon:      (d) => <FlareIcon fontSize="inherit" sx={{ color: d?.history[0].color }} />,
      component: (w, id, color) => <Teleoscope id={id} windata={w} color={color} />,
    },
    Teleoscopes: {
      tag:       "teleoscopes",
      type:      "Teleoscopes",
      apipath:   "teleoscopes",
      nodetype:  WindowNode,      
      title:     function () {return this.type},
      color:     () => color,
      icon:      () => <FlareIcon fontSize="inherit" sx={style} />,
      component: (w, id, color) => <Teleoscopes id={id} windata={w} color={color} />,
    },
    Projection: {
      tag:       "projection",
      type:      "Projection",
      apipath:   "projections",
      nodetype:  TargetNode,      
      title:     (d) => `Projection: ${d?.history[0].label}`,
      color:     (d) => d?.history[0].color,
      icon:      (d) => <Diversity2Icon fontSize="inherit" sx={{ color: d?.history[0].color }} />,
      component: (w, id, color) => <Projection id={id} windata={w} color={color} />,
    },
    Projections: {
      tag:       "projectionpalette", // projections?
      type:      "Projections",
      apipath:   "projections",
      nodetype:  WindowNode,      
      title:     function () {return this.type},
      color:     () => color,
      icon:      () => <Diversity2Icon fontSize="inherit" sx={style} />,
      component: (w, id, color) => <ProjectionPalette id={id} windata={w} color={color} />,
    },
    "Projection Palette": { // TODO REFACTOR
      icon: () => {
        return <Diversity2Icon fontSize="inherit" sx={style} />;
      },
      component: (w, id, color) => {
        return <ProjectionPalette id={id} windata={w} color={color} />;
      },
      showWindow: false,
      title: () => {
        return `Projections`;
      },
      color: () => get_color(),
      tag: "projectionpalette",
    },
    Search: {
      tag:       "search",
      type:      "Search",
      apipath:   "search",
      nodetype:  SourceNode,      
      title:     function () {return this.type},
      color:     () => color,
      icon:      () => <SearchIcon fontSize="inherit" sx={style} />,
      component: (w, id, color) => <Search id={id} windata={w} color={color} />,
    },
    Groups: {
      tag:       "groups",
      type:      "Groups",
      apipath:   "groups",
      nodetype:  WindowNode,      
      title:     function () {return this.type},
      color:     () => color,
      icon:      () => <FolderCopyIcon fontSize="inherit" sx={style} />,
      component: (w, id, color) => <Groups id={id} windata={w} color={color} />,
    },
    Clusters: {
      tag:       "clusters",
      type:      "Clusters",
      apipath:   "clusters",
      nodetype:  WindowNode,      
      title:     function () {return this.type},
      color:     () => color,
      icon:      () => <Diversity2Icon fontSize="inherit" sx={style} />,
      component: (w, id, color) => <Clusters id={id} windata={w} color={color} />,
    },
    Cluster: {
      tag:       "cluster",
      type:      "Cluster",
      apipath:   "cluster",
      nodetype:  WindowNode,      
      title:     (d) => d?.history[0].label,
      color:     (d) => d?.history[0].color,
      icon:      (d) => <TopicIcon fontSize="inherit" sx={{ color: d?.history[0].color }} />,
      component: (w, id, color) => <Cluster id={id} windata={w} color={color} />,
    },
    Bookmarks: {
      tag:       "bookmarks",
      type:      "Bookmarks",
      apipath:   "bookmarks",
      nodetype:  WindowNode,      
      title:     function () {return this.type},
      color:     () => color,
      icon:      () => <StarIcon fontSize="inherit" sx={style} />,
      component: (w, id, color) => <Clusters id={id} windata={w} color={color} />,
    },
    Settings: {
      tag:       "settings",
      type:      "Settings",
      apipath:   "settings",
      nodetype:  WindowNode,      
      title:     function () {return this.type},
      color:     () => color,
      icon:      () => <SettingsIcon fontSize="inherit" sx={style} />,
      component: (w, id, color) => <Clusters id={id} windata={w} color={color} />,
    },
    Workflows: {
      tag:       "workflows",
      type:      "Workflows",
      apipath:   "workflows",
      nodetype:  WindowNode,
      title:     function () {return this.type},
      color:     () => color,
      icon:      (sx = style) => <AccountTreeIcon fontSize="inherit" sx={sx} />,
      component: (w, id, color) => <Clusters id={id} windata={w} color={color} />,
    },
    Operation: {
      tag:       "operation",
      type:      "Operation",
      apipath:   "operation",
      nodetype: OperationNode,
      title:     function () {return this.type},
      color:     () => color,
      icon:      (sx = style) => <AccountTreeIcon fontSize="inherit" sx={sx} />,
      component: (w, id, color) => <Clusters id={id} windata={w} color={color} />,
    },
    Intersection: {
      tag:       "intersection",
      type:      "Intersection",
      apipath:   "intersection",
      nodetype: OperationNode,
      title:     function () {return this.type},
      color:     () => color,
      icon:      (sx = style) => <CgPathIntersect fontSize="inherit" sx={sx} />,
      component: (w, id, color) => <Intersection id={id} windata={w} color={color} />,
    },
    Exclusion: {
      tag:       "exclusion",
      type:      "Exclusion",
      apipath:   "exclusion",
      nodetype: OperationNode,
      title:     function () {return this.type},
      color:     () => color,
      icon:      (sx = style) => <CgPathExclude fontSize="inherit" sx={sx} />,
      component: (w, id, color) => <Exclusion id={id} windata={w} color={color} />,
    },
    Union: {
      tag:       "union",
      type:      "Union",
      apipath:   "union",
      nodetype: OperationNode,
      title:     function () {return this.type},
      color:     () => color,
      icon:      (sx = style) => <CgPathUnite fontSize="inherit" sx={sx} />,
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