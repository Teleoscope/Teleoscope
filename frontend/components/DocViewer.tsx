import React, { useContext } from "react";
import { swrContext } from "@/util/swr";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Typography, Stack, List, ListItem } from "@mui/material";
import WindowDefinitions from "./WindowFolder/WindowDefinitions";

export default function DocViewer(props) {
  const swr = useContext(swrContext);
  const { document } = swr.useSWRAbstract("document", `document/${props.id}`);
  return (
    <Accordion disableGutters={true} square={true}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="panel3a-content"
        id="panel3a-header"
      >
          <Typography noWrap align="left">
            {WindowDefinitions()["Document"].icon()}
            {`${document?.title.slice(0,20)}...`}
          </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1} sx={{ margin: "1em" }}>
          <Typography variant="h5">{document?.title}</Typography>
          <Typography variant="body">{document?.text}</Typography>
          <List>
            {document?.metadata
              ? Object.entries(document.metadata).map(([key, value]) => {
                  return (
                    <ListItem key={key + value}>
                      <Typography variant="caption" sx={{ marginRight: "1em" }}>
                        {key}:{" "}
                      </Typography>
                      <Typography noWrap variant="caption">
                        {value}
                      </Typography>
                    </ListItem>
                  );
                })
              : ""}
          </List>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
