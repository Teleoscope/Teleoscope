import { Stack, Typography, Accordion, AccordionSummary, AccordionDetails, Divider } from "@mui/material";
import { useSWRHook } from "@/util/swr";

import { useAppSelector, useWindowDefinitions } from "@/util/hooks";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DocumentList from "../Documents/DocumentList";

export default function TeleoscopeViewer(props) {
  const swr = useSWRHook();
  const { teleoscope } = swr.useSWRAbstract(
    "teleoscope", 
    `graph/${props.id}`
  );
  const settings = useAppSelector((state) => state.windows.settings);
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
        {/* <Stack direction="column">
          {teleoscope?.history[0].rank_slice.map(([docid, rank]) => (
            <DocumentListItem key={docid} id={docid}></DocumentListItem>
          ))}
        </Stack> */}
        <Stack spacing={1} sx={{ margin: "1em" }}>
          {/* <Typography variant="h5">Teleoscope</Typography> */}
          <Divider></Divider>
          <div style={{height: "25vh"}}>
            <DocumentList data={data} pagination={true} loadMore={handleLoadMore}></DocumentList>
          </div>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
