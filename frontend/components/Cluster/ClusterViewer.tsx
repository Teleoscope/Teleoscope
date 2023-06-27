import React, { useContext } from "react";
import { swrContext } from "@/util/swr";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Typography, Stack, List, Divider } from "@mui/material";
import { useAppSelector, useWindowDefinitions } from "@/util/hooks";
import DocumentListItem from "@/components/Documents/DocumentListItem";
import DocumentList from "@/components/Documents/DocumentList";
import { Virtuoso } from "react-virtuoso";
import ItemList from "@/components/ItemList";

export default function DocViewer(props) {
  const swr = useContext(swrContext);
  const { cluster } = swr.useSWRAbstract("cluster", `clusters/${props.id}`);
  const settings = useAppSelector((state) => state.windows.settings);
  const wdefs = useWindowDefinitions();
  
  const data = cluster?.history[0].included_documents.map((p) => {
    return [p, 1.0];
  });


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
          {wdefs.definitions()["Group"].icon(cluster)}
          {`${cluster?.history[0].label}`}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1} sx={{ margin: "1em" }}>
          <Typography variant="h5">{cluster?.history[0].label}</Typography>
          <Divider></Divider>
          {/* <List>
            {cluster?.history[0].included_documents.map((docid) => (
              <DocumentListItem key={docid} id={docid}></DocumentListItem>
            ))}
          </List> */}
          {/* TODO - do above as Virtuoso component like ItemList.tsx */}
          <Virtuoso
            data={data}
            itemContent={(index, item) => {
              return <DocumentListItem key={item[0]} id={item[0]} />;            
            }}
          />
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
