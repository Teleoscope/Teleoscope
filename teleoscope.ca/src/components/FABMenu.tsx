//FABMenu.tsx

import React from "react";
import SpeedDial from "@mui/material/SpeedDial";
import SpeedDialIcon from "@mui/material/SpeedDialIcon";
import SpeedDialAction from "@mui/material/SpeedDialAction";

// actions
import { makeNode } from "@/actions/appState";
import { useSelector, useDispatch } from "react-redux";
import { useWindowDefinitions } from "@/lib/hooks";

export default function FABMenu({ windata }) {
  const [open, setOpen] = React.useState(true);
  const dispatch = useDispatch();
  const workflow_id = useSelector((state) => state.appState.workflow._id);
  
  const wdefs = useWindowDefinitions();
  const settings = useSelector((state) => state.appState.workflow.settings);
  
  const actions = [
    "Search",
    "Group",
    "Teleoscope",
    "Projection",
    "Note",
    "Divider",
    "Union",
    "Difference",
    "Intersection",
    "Exclusion"
  ]

  const actionMap = {
    "Search": "Search",
    "Group": "Group",
    "Teleoscope": "Rank",
    "Projection": "Projection",
    "Note": "Note",
    "Divider": "Divider",
    "Union": "Union",
    "Difference": "Difference",
    "Intersection": "Intersection",
    "Exclusion":" Exclusion"
  }

  const handleAddNode = (type) => {
    dispatch(makeNode({
      oid: type, 
      type: type,
      width: settings.default_document_width,
      height: settings.default_document_height,
      x: windata.x + windata.width + 10, 
      y: windata.y
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
      {actions.map((action) => {

        if (action == "Divider") {
         return <SpeedDialAction key={action} sx={{ visibility: 'hidden', height: "1px", margin: 0, padding: 0 }} />
        }
          return <SpeedDialAction
          sx={{ color: settings.color }}
          key={action}
          icon={wdefs.definitions()[action].icon()}
          tooltipTitle={actionMap[action]}
          tooltipPlacement="right"
          tooltipOpen={settings.showFABToolTip}
          onClick={() =>
            handleAddNode(
              wdefs.definitions()[action].type
            )
          }
          />
      }

       
      )}
    </SpeedDial>
  );
}
