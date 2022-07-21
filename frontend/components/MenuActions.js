import FileCopyIcon from '@mui/icons-material/FileCopyOutlined';
import SaveIcon from '@mui/icons-material/Save';
import PrintIcon from '@mui/icons-material/Print';
import ShareIcon from '@mui/icons-material/Share';
import SearchIcon from '@mui/icons-material/Search';
import FlareIcon from '@mui/icons-material/Flare';
import TopicIcon from '@mui/icons-material/Topic';

const actions = [
  { 
    icon: <SearchIcon />, 
    name: 'Search', 
    default_window: {i: "%search", x:0, y:0, w:2, h:10, type: "Search", isResizable: true}
  },
  { 
    icon: <FlareIcon />, 
    name: 'Teleoscope', 
    default_window: {i: "teleoscope_new", x:0, y:0, w:2, h:10, type: "Teleoscope", isResizable: true}
  },
  { 
    icon: <TopicIcon />, 
    name: 'Groups', 
    default_window: {i: "group", x:0, y:0, w:2, h:10, type: "Group Palette", isResizable: true}
  },
];

export default function MenuActions() {
  return actions;
}