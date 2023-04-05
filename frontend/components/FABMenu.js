//FABMenu.js
import * as React from 'react';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';

// custom
import MenuActions from "./Context/ContextMenuActions"

// actions
import { makeNode } from "../actions/windows";
import { useSelector, useDispatch } from "react-redux";
import useSWRAbstract from "../util/swr"

export default function FABMenu(props) {
  const [open, setOpen] = React.useState(false);
  const dispatch = useDispatch();
  const session_id = useSelector((state) => state.activeSessionID.value);
  const { session } = useSWRAbstract("session", `/api/sessions/${session_id}`);
  const actions = {
    'Search': MenuActions()['Search'],
    'Teleoscopes': MenuActions()['Teleoscopes'],
    'Groups': MenuActions()['Groups'],
    'Clusters': MenuActions()['Clusters'],
    'Notes': MenuActions()['Notes']
  }

  
  const get_color = () => session ? session.history[0].color : "#4E5CBC"
  const handleAddNode = (id, type) => {
    const newNode = {
        id: id,
        type: "windowNode",
        position: {x: props.windata.x + props.windata.width + 10, y: props.windata.y},
        style : { 
        width: 400,
        height: 300,
        },
        data: { label: `${id} node`, i: id, type: type },
    };
    dispatch(makeNode({node: newNode}))
  }

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleClick = () => {
    setOpen((prevOpen) => !prevOpen);
  };

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
      onClick={handleClick}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      open={open}
    >
      {Object.keys(actions).map((action) => (
        <SpeedDialAction
          sx={{color: get_color()}}
          key={action}
          icon={actions[action].icon}
          tooltipTitle={action}
          onClick={() => handleAddNode(actions[action].default_window.i, actions[action].default_window.type)}
        />
      ))}
    </SpeedDial>
  );
}
