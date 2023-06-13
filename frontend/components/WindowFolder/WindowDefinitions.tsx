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
import Notes from "@/components/Notes";

import { PreprocessTitle } from "@/util/Preprocessers";

export default function WindowDefinitions(windowState) {
  const color = windowState.color;

  const style = [
    { color: color },
  { "& .MuiChip-icon": { color: color } },
  ];

  const config = {
    Note: {
      tag:       "note",
      type:      "Note",
      title:     (d) => `${d?.history[0].label}`,
      color:     () => color,
      icon:      () => <CommentIcon fontSize="inherit" />,
      component: (w, id, color) => <Note id={id} windata={w} color={color} />,
    },
    Notes: {
      tag:       "notes",
      type:      "Notes",
      title:     function () {return this.type},
      color:     () => color,
      icon:      () => <CommentIcon fontSize="inherit" sx={style} />,
      component: (w, id, color) => <Notes id={id} windata={w} color={color} />,
    },
    FABMenu: {
      tag:       "fabmenu",
      type:      "FABMenu",
      title:     function () {return this.type},
      color:     () => color,
      icon:      () => <AddIcon fontSize="inherit" />,
      component: (w, id, color) => <FABMenu id={id} windata={w} color={color} />,
    },
    Group: {
      tag:       "group",
      type:      "Group",
      title:     (d) => `Group: ${d?.history[0].label}`,
      color:     (d) => d?.history[0].color,
      icon:      (d) => <TopicIcon fontSize="inherit" sx={{ color: d?.history[0].color }} />,
      component: (w, id, color) => <Group id={id} windata={w} color={color} />,
    },
    Document: {
      tag:       "document",
      type:      "Document",
      title:     (d) => PreprocessTitle(d?.title),
      color:     () => color,
      icon:      () => <ShortTextIcon fontSize="inherit" />,
      component: (w, id, color) => <Document id={id} windata={w} color={color} />,
    },
    Teleoscope: {
      tag:       "teleoscope",
      type:      "Teleoscope",
      title:     (d) => `Teleoscope: ${d?.history[0].label}`,
      color:     (d) => d?.history[0].color,
      icon:      (d) => <FlareIcon fontSize="inherit" sx={{ color: d?.history[0].color }} />,
      component: (w, id, color) => <Teleoscope id={id} windata={w} color={color} />,
    },
    Teleoscopes: {
      tag:       "teleoscopes",
      type:      "Teleoscopes",
      title:     function () {return this.type},
      color:     () => color,
      icon:      () => <FlareIcon fontSize="inherit" sx={style} />,
      component: (w, id, color) => <Teleoscopes id={id} windata={w} color={color} />,
    },
    Search: {
      tag:       "search",
      type:      "Search",
      title:     function () {return this.type},
      color:     () => color,
      icon:      () => <SearchIcon fontSize="inherit" sx={style} />,
      component: (w, id, color) => <Search id={id} windata={w} color={color} />,
    },
    Groups: {
      tag:       "groups",
      type:      "Groups",
      title:     function () {return this.type},
      color:     () => color,
      icon:      () => <FolderCopyIcon fontSize="inherit" sx={style} />,
      component: (w, id, color) => <Groups id={id} windata={w} color={color} />,
    },
    Clusters: {
      tag:       "clusters",
      type:      "Clusters",
      title:     function () {return this.type},
      color:     () => color,
      icon:      () => <Diversity2Icon fontSize="inherit" sx={style} />,
      component: (w, id, color) => <Clusters id={id} windata={w} color={color} />,
    },
    Cluster: {
      tag:       "cluster",
      type:      "Cluster",
      title:     (d) => d?.history[0].label,
      color:     (d) => d?.history[0].color,
      icon:      (d) => <TopicIcon fontSize="inherit" sx={{ color: d?.history[0].color }} />,
      component: (w, id, color) => <Cluster id={id} windata={w} color={color} />,
    },
    Bookmarks: {
      tag:       "bookmarks",
      type:      "Bookmarks",
      title:     function () {return this.type},
      color:     () => color,
      icon:      () => <StarIcon fontSize="inherit" sx={style} />,
      component: (w, id, color) => <Clusters id={id} windata={w} color={color} />,
    },
    Settings: {
      tag:       "settings",
      type:      "Settings",
      title:     function () {return this.type},
      color:     () => color,
      icon:      () => <SettingsIcon fontSize="inherit" sx={style} />,
      component: (w, id, color) => <Clusters id={id} windata={w} color={color} />,
    },
    Workflows: {
      tag:       "workflows",
      type:      "Workflows",
      title:     function () {return this.type},
      color:     () => color,
      icon:      (sx = style) => <AccountTreeIcon fontSize="inherit" sx={sx} />,
      component: (w, id, color) => <Clusters id={id} windata={w} color={color} />,
    },
    Operation: {
      tag:       "operation",
      type:      "Operation",
      title:     function () {return this.type},
      color:     () => color,
      icon:      (sx = style) => <AccountTreeIcon fontSize="inherit" sx={sx} />,
      component: (w, id, color) => <Clusters id={id} windata={w} color={color} />,
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