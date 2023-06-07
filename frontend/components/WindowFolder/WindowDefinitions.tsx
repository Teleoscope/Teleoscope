import React, { useContext } from "react";
import { useSelector } from "react-redux";
import { swrContext } from "@/util/swr";

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

// actions
import { RootState } from "@/stores/store";

// custom
import Notes from "@/components/WindowModules/Notes";
import FABMenu from "@/components/FABMenu";
import Group from "@/components/Group";
import Document from "@/components/Documents/Document";
import TeleoscopePalette from "@/components/WindowModules/TeleoscopePalette";
import Teleoscope from "@/components/Teleoscope";
import Search from "@/components/WindowModules/Search";
import GroupPalette from "@/components/WindowModules/GroupPalette";
import Clusters from "@/components/Cluster/Clusters";
import Cluster from "@/components/Cluster/Cluster";
import Projection from "@/components/Cluster/Projection";
import ProjectionPalette from "@/components/Cluster/ProjectionPalette";

import { PreprocessTitle } from "@/util/Preprocessers";
import NotePalette from "@/components/WindowModules/NotePalette";

export default function WindowDefinitions() {
  const session_id = useSelector(
    (state: RootState) => state.activeSessionID.value
  );
  const swr = useContext(swrContext);
  const { session } = swr.useSWRAbstract("session", `sessions/${session_id}`);

  interface Document {
    title: string;
  }
  const [doc, setDoc] = React.useState<Document | undefined>();

  const get_color = () => (session ? session.history[0].color : "#FF0000");

  // Helper functions
  const getReferencedDocument = (oid) => {
    fetch(
      `http://${swr.subdomain}.${process.env.NEXT_PUBLIC_FRONTEND_HOST}/api/${swr.subdomain}/document/${oid}`
    )
      .then((response) => response.json())
      .then((data) => setDoc(data));
  };

  const style = [
    { color: get_color() },
    { "& .MuiChip-icon": { color: get_color() } },
  ];

  return {
    Note: {
      icon: () => {
        return <CommentIcon fontSize="inherit" />;
      },
      component: (w, id, color) => {
        return <Notes id={id} windata={w} color={color} />;
      },
      showWindow: false,
      title: (d) => `${d?.history[0].label}`,
      color: () => get_color(),
      tag: "note",
    },
    "Note Palette": {
      icon: () => {
        return <CommentIcon fontSize="inherit" sx={style} />;
      },
      component: (w, id, color) => {
        return <NotePalette id={id} windata={w} color={color} />;
      },
      showWindow: false,
      title: () => {
        return `Notes`;
      },
      color: () => get_color(),
      tag: "notepalette",
    },
    FABMenu: {
      icon: () => {
        return <AddIcon fontSize="inherit" />;
      },
      component: (w, id, color) => {
        return <FABMenu id={id} windata={w} color={color} />;
      },
      showWindow: false,
      title: () => {
        return "FABMenu";
      },
      color: () => get_color(),
      tag: "fabmenu",
    },
    Group: {
      icon: (d) => {
        return (
          <TopicIcon fontSize="inherit" sx={{ color: d?.history[0].color }} />
        );
      },
      component: (w, id, color) => {
        return <Group id={id} windata={w} color={color} />;
      },
      showWindow: false,
      title: (d) => {
        return `Group: ${d?.history[0].label}`;
      },
      color: (d) => {
        return d?.history[0].color;
      },
      tag: "group",
    },
    Document: {
      icon: () => {
        return <ShortTextIcon fontSize="inherit" />;
      },
      component: (w, id, color) => {
        return <Document id={id} windata={w} color={color} />;
      },
      showWindow: false,
      title: (d) => {
        return PreprocessTitle(d?.title);
      },
      color: () => get_color(),
      tag: "document",
    },
    Teleoscope: {
      icon: (d) => {
        return (
          <FlareIcon fontSize="inherit" sx={{ color: d?.history[0].color }} />
        );
      },
      component: (w, id, color) => {
        return <Teleoscope id={id} windata={w} color={color} />;
      },
      showWindow: false,
      title: (d) => {
        return `Teleoscope: ${d?.history[0].label}`;
      },
      color: (d) => {
        return d?.history[0].color;
      },
      tag: "teleoscope",
    },
    "Teleoscope Palette": {
      icon: () => {
        return <FlareIcon fontSize="inherit" sx={style} />;
      },
      component: (w, id, color) => {
        return <TeleoscopePalette id={id} windata={w} color={color} />;
      },
      showWindow: false,
      title: () => {
        return `Teleoscopes`;
      },
      color: () => get_color(),
      tag: "teleoscopepalette",
    },
    Projection: {
      icon: (d) => {
        return (
          <Diversity2Icon fontSize="inherit" sx={{ color: d?.history[0].color }} />
        );
      },
      component: (w, id, color) => {
        return <Projection id={id} windata={w} color={color} />;
      },
      showWindow: false,
      title: (d) => {
        return `Projection: ${d?.history[0].label}`;
      },
      color: (d) => {
        return d?.history[0].color;
      },
      tag: "projection",
    },
    "Projection Palette": {
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
      icon: () => {
        return <SearchIcon fontSize="inherit" sx={style} />;
      },
      component: (w, id, color) => {
        return <Search id={id} windata={w} color={color} />;
      },
      showWindow: true,
      title: (d) => {
        return `Search`;
      },
      color: () => get_color(),
      tag: "search",
    },
    "Group Palette": {
      icon: () => {
        return <FolderCopyIcon fontSize="inherit" sx={style} />;
      },
      component: (w, id, color) => {
        return <GroupPalette id={id} windata={w} color={color} />;
      },
      showWindow: true,
      title: () => {
        return "Group Palette";
      },
      color: () => get_color(),
      tag: "grouppalette",
    },
    Cluster: {
      icon: (d) => {
        return (
          <TopicIcon fontSize="inherit" sx={{ color: d?.history[0].color }} />
        );
      },
      component: (w, id, color) => {
        return <Cluster id={id} windata={w} color={color} />;
      },
      showWindow: false,
      title: (d) => {
        return `Cluster: ${d?.history[0].label}`;
      },
      color: (d) => {
        return d?.history[0].color;
      },
      tag: "cluster",
    },
    Bookmarks: {
      icon: () => {
        return <StarIcon fontSize="inherit" sx={style} />;
      },
      component: (w, id, color) => {
        return <Clusters id={id} windata={w} color={color} />;
      },
      showWindow: true,
      title: () => {
        return "Bookmarks";
      },
      color: () => get_color(),
      tag: "bookmarks",
    },
    Settings: {
      icon: () => {
        return <SettingsIcon fontSize="inherit" sx={style} />;
      },
      component: (w, id, color) => {
        return <Clusters id={id} windata={w} color={color} />;
      },
      showWindow: true,
      title: () => {
        return "Settings";
      },
      color: () => get_color(),
      tag: "settings",
    },
    Workflows: {
      icon: (sx = style) => {
        return <AccountTreeIcon fontSize="inherit" sx={sx} />;
      },
      component: (w, id, color) => {
        return <Clusters id={id} windata={w} color={color} />;
      },
      showWindow: true,
      title: () => {
        return "Workflows";
      },
      color: () => get_color(),
      tag: "workflows",
    },
  };
}
