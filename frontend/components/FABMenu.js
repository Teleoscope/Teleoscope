//FABMenu.js

import * as React from 'react';
import Box from '@mui/material/Box';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';

// custom
import MenuActions from "../components/MenuActions"

// actions
import { addWindow } from "../actions/windows";
import { useDispatch } from "react-redux";

const actions = MenuActions();

export default function FABMenu(props) {
  const dispatch = useDispatch();

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
             onClick={() => dispatch(addWindow(action.default_window))}
           />
         ))}
       </SpeedDial>
    
  );
}