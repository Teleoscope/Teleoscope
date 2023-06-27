import React, { useState, useContext } from "react";
import {
  Stack,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  List,
} from "@mui/material";
import { swrContext } from "@/util/swr";

import { useAppSelector } from "@/util/hooks";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DocumentListItem from "@/components/Documents/DocumentListItem";
import WindowDefinitions from "@/components/WindowFolder/WindowDefinitions";

export default function TeleoscopeViewer(props) {
  const swr = useContext(swrContext);
  const { teleoscope } = swr.useSWRAbstract(
    "teleoscope",
    `teleoscopes/${props.id}`
  );
  const settings = useAppSelector((state) => state.windows.settings);
  const windowState = useAppSelector((state) => state.windows);
  const wdefs = WindowDefinitions(windowState);

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
        <Typography noWrap align="left">
          {wdefs["Teleoscope"].icon(teleoscope)}
          {`${teleoscope?.history[0].label}`}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        {/* <Stack direction="column">
          {teleoscope?.history[0].rank_slice.map(([docid, rank]) => (
            <DocumentListItem key={docid} id={docid}></DocumentListItem>
          ))}
        </Stack> */}
        <Stack spacing={1} sx={{ margin: "1em" }}>
          <Typography variant="h5">{teleoscope?.history[0].label}</Typography>
          <Divider></Divider>
          <List>
            {teleoscope?.history[0].rank_slice.map(([docid, rank]) => (
              <DocumentListItem key={docid} id={docid}></DocumentListItem>
            ))}
          </List>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
