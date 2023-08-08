// Projections.tsx
import { useState } from "react";

// mui
import LoadingButton from "@mui/lab/LoadingButton";

// util
import { useSWRHook } from "@/util/swr";
import DocumentList from "@/components/Documents/DocumentList";

export default function Projection(props) {
  const [projection_id] = useState(props.id.split("%")[0]);
  const swr = useSWRHook();
  const { projection } = swr.useSWRAbstract(
    "projection", 
    `graph/${projection_id}`
  );

  const doclists = projection?.doclists;

  const status = () => {
   if (projection) {
    if (projection.doclists.length > 0) {
      return null
    }
    if (projection.edges.control.length > 0) {
      return <span style={{margin: "0.5em"}}>{projection.status}</span>
    }
   }
   return null
  }
  
  return (
    <>{status()}
      {projection ? (
        <DocumentList data={doclists} pagination={true}></DocumentList>
      ) : (
        <LoadingButton loading={true} />
      )}
    </>
  );
}
