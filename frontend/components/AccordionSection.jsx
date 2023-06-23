import React, { useState } from "react";
import {
  Typography,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from "@mui/material";

export default function AccordionSection(props) {
  const [expanded, setExpanded] = useState(false);

  const handleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <Accordion
      expanded={expanded}
      disableGutters={true}
      square={true}
      sx={{
        paddingTop: expanded ? "4px" : "",
        borderTop: expanded ? "1px solid #D3D3D3" : "",
      }}
    >
      <AccordionSummary
        onClick={handleExpand}
        expanded={props.expanded}
        aria-controls="panel2a-content"
        id="panel2a-header"
      >
        <Typography noWrap>
          {props.icon} {props.compact ? "" : props.text}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>{props.children}</AccordionDetails>
    </Accordion>
  );
}
