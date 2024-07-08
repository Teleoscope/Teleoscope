import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import DocumentList from "@/components/Documents/DocumentList";
import ButtonActions from "@/components/ButtonActions";
import { SaveXLSX, CopyJson, CopyText, SaveDocx } from "@/components/Groups/GroupActions";
import Count from "@/components/Count";
import { useSWRF } from "@/lib/swr";


export default function Group({ id: winId, windata }) {
  const id = winId.split("%")[0];
  
  const { group } = useSWRF(`/api/group?group=${id}`);
  
  // Prepare data for the DocumentList and ButtonActions
  const data = group?.history[0].included_documents.map(doc => [doc, 1.0]);
  
  // Button actions configuration
  const buttonActionsConfig = { data, group };

  return (
    <Stack direction="column" sx={{ height: "100%" }}>
      <ButtonActions
        inner={[
          [SaveXLSX, buttonActionsConfig],
          [SaveDocx, buttonActionsConfig],
          [CopyJson, buttonActionsConfig],
          [CopyText, buttonActionsConfig],
        ]}
      />
      <ButtonActions inner={[[Count, {loading: data ? false : true, label: "Number of documents", count: data?.length }]]} />
      <Box sx={{ flexGrow: 1, flexDirection: "column" }}>
        <DocumentList
          data={[{ id, ranked_documents: data }]}
          pagination={true}
          showGroupIcon={false}
          showOrientIcon={false}
          showRemoveIcon={false}
          group={group}
          ShowDeleteIcon={true}
        />
      </Box>
    </Stack>
  );
}
