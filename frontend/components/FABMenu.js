//FABMenu.js
import * as React from 'react';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';

// custom
import MenuActions from "../components/ContextMenuActions"

// actions
import { addWindow } from "../actions/windows";
import { useDispatch } from "react-redux";

export default function FABMenu(props) {
  const dispatch = useDispatch();
  const actions = MenuActions();

  return (
    <SpeedDial
      ariaLabel="SpeedDial basic example"
      direction="down"
      icon={<SpeedDialIcon />}
      className="drag-handle"

    >
      {Object.keys(actions).map((action) => (
        <SpeedDialAction
          key={action}
          icon={actions[action].icon}
          tooltipTitle={action}
          onClick={() => dispatch(addWindow(actions[action].default_window))}
        />
      ))}
    </SpeedDial>

  );
}