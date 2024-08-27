import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Typography, Stack, Divider } from "@mui/material";
import { useAppSelector } from "@/lib/hooks";
import DocumentList from "@/components/Documents/DocumentList";
import WindowDefinitions from "../WindowFolder/WindowDefinitions";

function withDataViewer(WrappedComponent, getData, getType) {
  return function DataViewerHOC({ id, type }) {
    const data = getData(id);
    const { settings } = useAppSelector((state) => state.appState.workspace);
    const { color } = useAppSelector((state) => state.appState.workflow.settings);

    const handleLoadMore = () => {
      console.log("stub");
    };

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
            {WindowDefinitions(getType(type)).icon(color)} {data ? data.label : "Loading..."}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1} sx={{ margin: "1em" }}>
            <Divider></Divider>
            <div style={{ height: "25vh" }}>
              <DocumentList data={data?.doclists || []} pagination={true} loadMore={handleLoadMore}></DocumentList>
            </div>
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  };
}

export default withDataViewer;
