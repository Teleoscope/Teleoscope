import React, { useState, useContext } from "react";
import {
  Stack,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { swrContext } from "@/util/swr";

import Teleoscope from "./Teleoscope";
import { useAppSelector } from "@/util/hooks";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DocumentListItem from "./Documents/DocumentListItem";

export default function TeleoscopeViewer(props) {
  const swr = useContext(swrContext);
  const { teleoscope } = swr.useSWRAbstract(
    "teleoscope",
    `teleoscopes/${props.id}`
  );
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
        <Typography variant="h5">{teleoscope?.history[0].label}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack direction="column">
        {teleoscope?.history[0].rank_slice.map(([docid, rank]) => <DocumentListItem key={docid} id={docid}></DocumentListItem>)}

        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
