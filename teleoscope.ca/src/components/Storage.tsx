// Group.tsx
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import DocumentList from "@/components/Documents/DocumentList";
import ButtonActions from "@/components/ButtonActions";
import { SaveXLSX, CopyJson, CopyText, SaveDocx } from "@/components/Groups/GroupActions";
import Count from "@/components/Count";
import { WindowProps } from "../WindowFolder/WindowFactory";


export default function Storage({ data: storage, reactflow_node }: WindowProps) {
  // Prepare data for the DocumentList and ButtonActions
  const data = storage?.docs?.map(doc => [doc, 1.0]);
  const id = reactflow_node.id
  
  // Button actions configuration
  const buttonActionsConfig = { data, storage };

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
          group={storage}
          ShowDeleteIcon={true}
        />
      </Box>
    </Stack>
  );
}
