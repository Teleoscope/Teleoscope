//FABMenu.js
import React, { useContext } from "react";
import SpeedDial from "@mui/material/SpeedDial";
import SpeedDialIcon from "@mui/material/SpeedDialIcon";
import SpeedDialAction from "@mui/material/SpeedDialAction";

// custom
import WindowDefinitions from "./WindowFolder/WindowDefinitions";

// actions
import { makeNode } from "@/actions/windows";
import { useSelector, useDispatch } from "react-redux";
import { swrContext } from "@/util/swr";

export default function FABMenu(props) {
  const [open, setOpen] = React.useState(false);
  const dispatch = useDispatch();
  const session_id = useSelector((state) => state.activeSessionID.value);
  const swr = useContext(swrContext);
  const { session } = swr.useSWRAbstract("session", `sessions/${session_id}`);
  const windowState = useSelector((state) => state.windows);
  const wdefs = WindowDefinitions(windowState);
  const settings = useSelector((state) => state.windows.settings);
  
  const actions = {
    Search: wdefs["Search"],
    Teleoscopes: wdefs["Teleoscopes"],
    Groups: wdefs["Groups"],
    Clusters: wdefs["Clusters"],
    Notes: wdefs["Notes"],
  };

  const get_color = () => session ? session.history[0].color : "#4E5CBC";
  const handleAddNode = (type) => {
    dispatch(makeNode({ 
      oid: type, 
      type: type,
      width: settings.default_document_width,
      height: settings.default_document_height,
      x: props.windata.x + props.windata.width + 10, 
      y: props.windata.y
    }));
  };

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
          "&:hover": {
            bgcolor: get_color(),
          },
        },
      }}
      onClick={handleClick}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      open={open || props.alwaysOpen}
      transitionDuration={0}
    >
      {Object.keys(actions).map((action) => (
        <SpeedDialAction
          sx={{ color: get_color() }}
          key={action}
          open={open}
          icon={actions[action].icon()}
          tooltipTitle={action}
          onClick={() =>
            handleAddNode(
              actions[action].type
            )
          }
        />
      ))}
    </SpeedDial>
  );
}
