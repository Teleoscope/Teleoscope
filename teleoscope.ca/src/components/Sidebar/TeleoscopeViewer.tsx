import { Stack, Typography, Accordion, AccordionSummary, AccordionDetails, Divider } from "@mui/material";

import { useAppSelector, useWindowDefinitions } from "@/lib/hooks";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DocumentList from "../Documents/DocumentList";
import { useSWRF } from "@/lib/swr";

export default function TeleoscopeViewer({ id }) {
  
  const { data: teleoscope } = useSWRF(`graph/${id}`);
  const settings = useAppSelector((state) => state.appState.workflow.settings);
  const wdefs = useWindowDefinitions();

  const handleLoadMore = () => { console.log("stub") }

  const data = teleoscope?.doclists

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
          {wdefs.definitions()["Teleoscope"].icon(teleoscope)} Teleoscope
          {/* {`${teleoscope?.history[0].label}`} */}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1} sx={{ margin: "1em" }}>
          <Divider></Divider>
          <div style={{height: "25vh"}}>
            <DocumentList data={data} pagination={true} loadMore={handleLoadMore}></DocumentList>
          </div>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
