// Projections.tsx
import { useState } from "react";

// mui
import LoadingButton from "@mui/lab/LoadingButton";

// custom components
import Clusters from "@/components/Cluster/Clusters";

// util
import { useSWRHook } from "@/util/swr";

export default function Projection(props) {
  const [projection_id] = useState(props.id.split("%")[0]);
  const swr = useSWRHook();
  const { projection } = swr.useSWRAbstract(
    "projection", 
    `projections/${projection_id}`
  );
 
  return (
    <>
      {projection ? (
        <Clusters data={projection_id}/>
      ) : (
        <LoadingButton loading={true} />
      )}
    </>
  );
}
