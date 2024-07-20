import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Typography, Stack, Divider } from "@mui/material";
import { useAppSelector } from "@/lib/hooks";
import DocumentList from "@/components/Documents/DocumentList";
import { useSWRF } from "@/lib/swr";
import WindowDefinitions from "../WindowFolder/WindowDefinitions";

export default function OperationViewer({id, type}) {
  
  const { data: operation } = useSWRF(`/api/graph?uid=${id}`);
  const { settings } = useAppSelector((state) => state.appState.workspace);
  
  const data = operation?.doclists


  const handleLoadMore = () => { console.log("stub") }

  return (
    <Accordion
      defaultExpanded={settings?.expanded}
      disableGutters={true}
      square={true} 
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="panel3a-content"
        id="panel3a-header"
      >
        <Typography noWrap align="left">
          {WindowDefinitions(type).icon(operation)} {type}
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
