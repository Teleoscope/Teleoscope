// Teleoscope.js
import { useState } from "react";

// mui
import LoadingButton from "@mui/lab/LoadingButton";

// custom components
import DocumentList from "@/components/Documents/DocumentList";

// util
import { useSWRHook } from "@/util/swr";
import { Typography } from "@mui/material";
import ButtonActions from "./ButtonActions";

export default function Teleoscope(props) {
  const [teleoscope_id] = useState(props.id.split("%")[0]);
  const swr = useSWRHook();

  const { teleoscope } = props.windata?.demo
    ? props.windata.demodata
    : swr.useSWRAbstract("teleoscope", `graph/${teleoscope_id}`);

  const doclists = teleoscope?.doclists;
  const Status = (teleoscope) => {
    if (teleoscope) {
     if (teleoscope.doclists.length > 0) {
       return <Typography sx={{ width: "100%" }} align="center" variant="caption">
         Number of results: {teleoscope.doclists.reduce((a, d) => a + d.ranked_documents.length, 0)}</Typography>
     }
     if (teleoscope.edges.control.length > 0) {
       return  <Typography sx={{ width: "100%" }} align="center" variant="caption">
         {teleoscope.status}</Typography>
     }
    }
    
    return null
   }
 
  return (
    <><ButtonActions inner={[[Status, teleoscope]]}></ButtonActions>
      {teleoscope ? (
        <DocumentList data={doclists} pagination={true}></DocumentList>
      ) : (
        <LoadingButton loading={true} />
      )}
    </>
  );
}
