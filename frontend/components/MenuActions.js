import FileCopyIcon from '@mui/icons-material/FileCopyOutlined';
import SaveIcon from '@mui/icons-material/Save';
import PrintIcon from '@mui/icons-material/Print';
import ShareIcon from '@mui/icons-material/Share';
import SearchIcon from '@mui/icons-material/Search';
import FlareIcon from '@mui/icons-material/Flare';
import TopicIcon from '@mui/icons-material/Topic';

const actions = {
  Search: { 
    icon: <SearchIcon />, 
    default_window: {i: "%search", w:3, h:10, type: "Search", isResizable: true}
  },
  Teleoscope: { 
    icon: <FlareIcon />, 
    default_window: {i: "%teleoscope", w:3, h:10, type: "Teleoscope", isResizable: true}
  },
  Groups: { 
    icon: <TopicIcon />, 
    default_window: {i: "%grouppalette", w:2, h:10, type: "Group Palette", isResizable: true}
  },
};

export default function MenuActions() {
  return actions;
}