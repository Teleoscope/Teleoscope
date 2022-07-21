//FABMenu.js

import * as React from 'react';
import Box from '@mui/material/Box';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import FileCopyIcon from '@mui/icons-material/FileCopyOutlined';
import SaveIcon from '@mui/icons-material/Save';
import PrintIcon from '@mui/icons-material/Print';
import ShareIcon from '@mui/icons-material/Share';
import SearchIcon from '@mui/icons-material/Search';
import FlareIcon from '@mui/icons-material/Flare';
import TopicIcon from '@mui/icons-material/Topic';

const actions = [
  { icon: <SearchIcon />, name: 'Search' },
  { icon: <FlareIcon />, name: 'Teleoscope' },
  { icon: <TopicIcon />, name: 'Groups' },
];

export default function FABMenu(props) {
  return (
    
       <SpeedDial
         ariaLabel="SpeedDial basic example"
         direction="down"
         // sx={{ position: 'absolute', top: 16, left: 16 }}
         icon={<SpeedDialIcon />}
       >
         {actions.map((action) => (
           <SpeedDialAction
             key={action.name}
             icon={action.icon}
             tooltipTitle={action.name}
           />
         ))}
       </SpeedDial>
    
  );
}