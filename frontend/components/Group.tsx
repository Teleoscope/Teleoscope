// mui

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

// custom
import DocumentList from "@/components/Documents/DocumentList";

//utils
import { useSWRHook } from "@/util/swr";
import ButtonActions from "@/components/ButtonActions";
import { CopyJson, CopyText, SaveDocx } from "@/components/GroupActions";

export default function Group({ id: winId, windata, color }) {
  const id = winId.split("%")[0];
  const swr = useSWRHook();
  const { group } = windata.demo
    ? windata.demodata
    : swr.useSWRAbstract("group", `groups/${id}`); 
  const data = group?.history[0].included_documents.map((p) => {
    return [p, 1.0];
  });

  const ButtonActionsConfig = {
    swr: swr,
    data: data,
    group: group,
  };

  return (
    <Stack direction="column" sx={{ height: "100%" }}>
      <Box sx={{ flexGrow: 1, flexDirection: "column", margin: "2px" }}>
        <ButtonActions
          inner={[
            [SaveDocx, ButtonActionsConfig],
            [CopyJson, ButtonActionsConfig],
            [CopyText, ButtonActionsConfig],
          ]}
        ></ButtonActions>
        <DocumentList
          data={data}
          pagination={true}
          showGroupIcon={false}
          showOrientIcon={false}
          showRemoveIcon={false}
          group={group}
          ShowDeleteIcon={true}
        ></DocumentList>
      </Box>
    </Stack>
  );
}
