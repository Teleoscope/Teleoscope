import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Typography, Stack, Divider } from "@mui/material";
import { useAppSelector, useWindowDefinitions } from "@/lib/hooks";
import DocumentList from "@/components/Documents/DocumentList";
import { CopyJson, CopyText, SaveDocx } from "@/components/Groups/GroupActions";
import ButtonActions from "@/components/ButtonActions";
import { useSWRF } from "@/lib/swr";
export default function DocViewer(props) {
   
  const { data: group } = useSWRF(`groups/${props.id}`);
  const settings = useAppSelector((state) => state.appState.workflow.settings);
  const data = group?.history[0].included_documents.map((p) => {
    return [p, 1.0];
  });

  const handleLoadMore = () => { console.log("stub") }
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
          {wdefs.definitions()["Group"].icon(group)}
          {`${group?.history[0].label}`}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1} sx={{ margin: "1em" }}>
          <Typography variant="h5">{group?.history[0].label}</Typography>
          <Divider></Divider>
          <ButtonActions
            inner={[
              [
                SaveDocx,
                {
                  swr: swr,
                  data: data,
                  group: group,
                },
              ],
              [
                CopyJson,
                {
                  swr: swr,
                  data: data,
                  group: group,
                },
              ],
              [
                CopyText,
                {
                  swr: swr,
                  data: data,
                  group: group,
                },
              ],
            ]}
          ></ButtonActions>
          {/* <List>
            {group?.history[0].included_documents.map((docid) => (
              <DocumentListItem key={docid} id={docid}></DocumentListItem>
            ))}
          </List> */}
          <div style={{height: "25vh"}}>
            <DocumentList           data={[{ranked_documents: data}]} pagination={true} loadMore={handleLoadMore}></DocumentList>
          </div>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
