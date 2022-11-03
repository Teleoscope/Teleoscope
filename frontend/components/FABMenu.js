//FABMenu.js
import * as React from 'react';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';

// custom
import MenuActions from "../components/ContextMenuActions"

// actions
import { addWindow } from "../actions/windows";
import { useSelector, useDispatch } from "react-redux";
import useSWRAbstract from "../util/swr"

export default function FABMenu(props) {
  const dispatch = useDispatch();
  const session_id = useSelector((state) => state.activeSessionID.value);
  const { session } = useSWRAbstract("session", `/api/sessions/${session_id}`);
  const actions = MenuActions();

  const get_color = () => session ? session.history[0].color : "#4E5CBC"


  return (
    <SpeedDial
      ariaLabel="SpeedDial basic example"
      direction="down"
      icon={<SpeedDialIcon />}
      className="drag-handle"
      FabProps={{
        sx: {
          bgcolor: get_color(),
          '&:hover': {
            bgcolor: get_color(),
          }
        }
      }}

    >
      {Object.keys(actions).map((action) => (
        <SpeedDialAction
          sx={{color: get_color()}}
          key={action}
          icon={actions[action].icon}
          tooltipTitle={action}
          onClick={() => dispatch(addWindow(actions[action].default_window))}
        />
      ))}
    </SpeedDial>

  );
}