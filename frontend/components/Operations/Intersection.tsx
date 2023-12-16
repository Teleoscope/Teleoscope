// Teleoscope.js
import { useState } from "react";

// mui
import LoadingButton from "@mui/lab/LoadingButton";

// custom components
import DocumentList from "@/components/Documents/DocumentList";
import Count from "@/components/Count";

// util
import { useSWRHook } from "@/util/swr";
import { Stack, Typography } from "@mui/material";
import ButtonActions from "@/components/ButtonActions";
import Histogram from "@/components/Histogram";

export default function Intersection({id, windata, color}) {
  const [node_id] = useState(id.split("%")[0]);
  const swr = useSWRHook();

  const { node } = windata?.demo
    ? windata.demodata
    : swr.useSWRAbstract("node", `graph/${node_id}`);

  const doclists = node?.doclists;
  const Status = (node) => {
    if (node) {
     if (node.doclists.length > 0) {
       return (
        <Stack direction="row" sx={{ width: "100%" }} spacing={2} alignItems="center" justifyContent="center">
          <Count count={node.doclists.reduce((a, d) => a + d.ranked_documents.length, 0)} />  
          <Histogram data={node.doclists[0].ranked_documents}></Histogram>
        </Stack>
        )
     }
     if (node.edges.control.length > 0) {
       return <Typography sx={{ width: "100%" }} align="center" variant="caption">
         {node.status}</Typography>
     }
    }
    
    return null
   }
 
  return (
    <><ButtonActions inner={[[Status, node]]}></ButtonActions>
      {node ? (
        <DocumentList data={doclists} pagination={true}></DocumentList>
      ) : (
        <LoadingButton loading={true} />
      )}
    </>
  );
}