//FABMenu.tsx

import React, { useContext } from "react";
import SpeedDial from "@mui/material/SpeedDial";
import SpeedDialIcon from "@mui/material/SpeedDialIcon";
import SpeedDialAction from "@mui/material/SpeedDialAction";

// custom
import WindowDefinitions from "@/components/WindowFolder/WindowDefinitions";

// actions
import { makeNode } from "@/actions/windows";
import { useSelector, useDispatch } from "react-redux";
import { swrContext } from "@/util/swr";
import { StompContext } from "@/components/Stomp";

export default function FABMenu(props) {
  const [open, setOpen] = React.useState(true);
  const dispatch = useDispatch();
  const session_id = useSelector((state) => state.activeSessionID.value);
  const swr = useContext(swrContext);
  const client = useContext(StompContext);
  
  const { session } = swr.useSWRAbstract("session", `sessions/${session_id}`);
  const windowState = useSelector((state) => state.windows);
  const wdefs = WindowDefinitions(windowState);
  const settings = useSelector((state) => state.windows.settings);
  
  const actions = [
    "Search",
    "Teleoscopes",
    "Projections",
    "Group",
    "Notes",
    "Filter",
    "Intersection",
    "Exclusion",
    "Union",
  ]

  const handleAddNode = (type) => {
    dispatch(makeNode({
      client: client,
      oid: type, 
      type: type,
      width: settings.default_document_width,
      height: settings.default_document_height,
      x: props.windata.x + props.windata.width + 10, 
      y: props.windata.y
    }));
  };


  const handleClick = () => {
    setOpen(!open);
  };

  return (
    <SpeedDial
      ariaLabel="SpeedDial basic example"
      direction="down"
      icon={<SpeedDialIcon />}
      className="drag-handle"
      onClose={() => console.log("close") }
      onOpen={() => console.log("open")}
      FabProps={{
        sx: {
          bgcolor: settings.color,
          "&:hover": {
            bgcolor: settings.color,

          },
        },
      }}
      onClick={handleClick}
   
      open={open}
      transitionDuration={10}
    >
      {actions.map((action) => (
        <SpeedDialAction
          sx={{ color: settings.color }}
          key={action}
          icon={wdefs[action].icon()}
          tooltipTitle={action}
          onClick={() =>
            handleAddNode(
              wdefs[action].type
            )
          }
        />
      ))}
    </SpeedDial>
  );
}
