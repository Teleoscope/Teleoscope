import { Stack, Typography, Accordion, AccordionSummary, AccordionDetails, Divider } from "@mui/material";

import { useAppSelector } from "@/lib/hooks";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DocumentList from "../Documents/DocumentList";
import { useSWRF } from "@/lib/swr";
import WindowDefinitions from "../WindowFolder/WindowDefinitions";

export default function RankViewer({ id }) {
  
  const { data: rank } = useSWRF(`/api/graph?uid=${id}`);
  const { settings } = useAppSelector((state) => state.appState.workspace);

  const handleLoadMore = () => { console.log("stub") }

  const data = rank?.doclists

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
          {WindowDefinitions("Rank").icon(rank)} Rank
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
