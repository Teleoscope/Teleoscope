import React, { useState, useContext } from "react";
import {
  Stack,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { swrContext } from "@/util/swr";

import Notes from "@/components/Note";
import { useAppSelector } from "@/util/hooks";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export default function NotesViewer(props) {
  const swr = useContext(swrContext);
  const { note } = swr.useSWRAbstract("note", `note/${props.id}`);
  const settings = useAppSelector((state) => state.windows.settings);

  return (
    <Accordion
      defaultExpanded={settings.defaultExpanded}
      disableGutters={true}
      square={true}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="panel3a-content"
        id="panel3a-header"
      >
        <Typography variant="h5">{note?.history[0].label}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack direction="column">
          <Notes id={props.id}></Notes>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
