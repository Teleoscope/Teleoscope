// Projections.tsx
import React, { useState, useContext } from "react";

// mui
import LoadingButton from "@mui/lab/LoadingButton";

// custom components
import DocumentList from "@/components/Documents/DocumentList";
import Clusters from "@/components/Cluster/Clusters";

// util
import { swrContext } from "@/util/swr";

export default function Projection(props) {
  const [projection_id] = useState(props.id.split("%")[0]);
  const swr = useContext(swrContext);
  const { projection } = props.windata?.demo
    ? props.windata.demodata
    : swr.useSWRAbstract("projection", `projections/${projection_id}`);
  const clusters = projection?.history[0]["clusters"];
  return (
    <>
      {projection ? (
        <Clusters />
      ) : (
        <LoadingButton loading={true} />
      )}
    </>
  );
}
