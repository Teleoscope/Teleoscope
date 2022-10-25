import React from 'react';
import SearchIcon from '@mui/icons-material/Search';
import FlareIcon from '@mui/icons-material/Flare';
import TopicIcon from '@mui/icons-material/Topic';
import Diversity2Icon from '@mui/icons-material/Diversity2';

const actions = {
  Search: {
    icon: <SearchIcon />,
    default_window: { i: "%search", w: 6, h: 10, type: "Search", isResizable: true }
  },
  Teleoscope: {
    icon: <FlareIcon />,
    default_window: { i: "%teleoscopepalette", w: 6, h: 10, type: "Teleoscope Palette", isResizable: true }
  },
  Groups: {
    icon: <TopicIcon />,
    default_window: { i: "%grouppalette", w: 4, h: 10, type: "Group Palette", isResizable: true }
  },
  Clusters: {
    icon: <Diversity2Icon />,
    default_window: { i: "%clusters", w: 4, h: 10, type: "Clusters", isResizable: true }
  },
  
};

export default function MenuActions() {
  return actions;
}