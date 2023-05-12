import React, { useContext } from "react";

// mui

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

// custom
import DocumentList from "@/components/Documents/DocumentList";

//utils
import { swrContext } from "@/util/swr";
import ButtonActions from "@/components/ButtonActions";
import { CopyJson, CopyText, SaveDocx } from "@/components/GroupActions";

export default function Group(props) {
  const id = props.id.split("%")[0];
  const swr = useContext(swrContext);
  const { group } = props.windata.demo
    ? props.windata.demodata
    : swr.useSWRAbstract("group", `groups/${id}`);
  const data = group?.history[0].included_documents.map((p) => {
    return [p, 1.0];
  });

  return (
    <Stack direction="column" sx={{ height: "100%" }}>
      <Box sx={{ flexGrow: 1, flexDirection: "column", margin: "2px" }}>
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
