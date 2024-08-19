import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Typography, Stack, Divider } from "@mui/material";
import { useAppSelector } from "@/lib/hooks";
import DocumentList from "@/components/Documents/DocumentList";
import { CopyJson, CopyText, SaveDocx } from "@/components/Groups/GroupActions";
import ButtonActions from "@/components/ButtonActions";
import { useSWRF } from "@/lib/swr";
import WindowDefinitions from "../WindowFolder/WindowDefinitions";

export default function GroupViewer({ reference }) {
   
  const { data: group } = useSWRF(reference ? `/api/group?group=${reference}`:null);
  const { settings } = useAppSelector((state) => state.appState.workspace);
  const { color } = useAppSelector((state) => state.appState.workflow.settings.color);

  const data = group?.docs?.map((p) => {
    return [p, 1.0];
  });

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
          {WindowDefinitions("Group").icon(group ? group.color : color)}
          {`${group?.label}`}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1} sx={{ margin: "1em" }}>
          <Typography variant="h5">{group?.label}</Typography>
          <Divider></Divider>
          <ButtonActions
            inner={[
              [
                SaveDocx,
                {
                  data: data,
                  group: group,
                },
              ],
              [
                CopyJson,
                {
                  data: data,
                  group: group,
                },
              ],
              [
                CopyText,
                {
                  data: data,
                  group: group,
                },
              ],
            ]}
          ></ButtonActions>
          <div style={{height: "25vh"}}>
            <DocumentList data={[{ranked_documents: data}]} pagination={true} loadMore={handleLoadMore}></DocumentList>
          </div>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
