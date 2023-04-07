import React from "react"
import DocumentList from "../Documents/DocumentList"

import { swrContext } from "@/util/swr"

export default function Cluster(props) {
    const id = props.id.split("%")[0];
    const swr = useContext(swrContext);
    const { cluster } = swr.useSWRAbstract("cluster", `clusters/${id}`);
    const data = cluster?.history[0].included_documents.map((p) => { return [p, 1.0] });
  
    return (
      <div style={{ overflow: "auto", height: "100%" }}>
        <DocumentList 
          data={data} 
          pagination={true} 
          showClusterIcon={false} 
          showOrientIcon={true} 
          showRemoveIcon={true}
          cluster={cluster}
        ></DocumentList>
      </div>
    )
}