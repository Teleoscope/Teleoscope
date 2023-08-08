// Projections.tsx
import { useState } from "react";

// mui
import LoadingButton from "@mui/lab/LoadingButton";

// util
import { useSWRHook } from "@/util/swr";
import DocumentList from "@/components/Documents/DocumentList";
import ButtonActions from "../ButtonActions";
import { Typography } from "@mui/material";

export default function Projection(props) {
  const [projection_id] = useState(props.id.split("%")[0]);
  const swr = useSWRHook();
  const { projection } = swr.useSWRAbstract(
    "projection", 
    `graph/${projection_id}`
  );

  const doclists = projection?.doclists;

  const Status = (projection) => {
   if (projection) {
    if (projection.doclists.length > 0) {
      return <Typography sx={{ width: "100%" }} align="center" variant="caption">
        Number of clusters: {projection.doclists.length}</Typography>
    }
    if (projection.edges.control.length > 0) {
      return  <Typography sx={{ width: "100%" }} align="center" variant="caption">
        {projection.status}</Typography>
    }
   }
   
   return null
  }


  
  return (
    <><ButtonActions inner={[[Status, projection]]}></ButtonActions>
      {projection ? (
        <DocumentList data={doclists} pagination={true}></DocumentList>
      ) : (
        <LoadingButton loading={true} />
      )}
    </>
  );
}
