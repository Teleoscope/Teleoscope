import React, { useContext } from "react";
import {
  Stack,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from "@mui/material";
import { swrContext } from "@/util/swr";
import { useAppSelector, useWindowDefinitions } from "@/util/hooks";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export default function NotesViewer(props) {
  const swr = useContext(swrContext);
  const { note } = swr.useSWRAbstract("note", `note/${props.id}`);
  const settings = useAppSelector((state) => state.windows.settings);
  const wdefs = useWindowDefinitions();

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
          {wdefs.definitions()["Note"].icon()}
          {`${note?.history[0].label}`}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1} sx={{ margin: "1em" }}>
          <Typography variant="h5">{note?.history[0].label}</Typography>
          <Divider></Divider>
          <Typography variant="small">{note?.history[0].content.blocks[0].text}</Typography>
        </Stack>
      </AccordionDetails>
    </Accordion>
    
  );
}
