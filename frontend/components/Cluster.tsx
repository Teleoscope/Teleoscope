import React from "react"
import PostList from "./PostList"

import useSWRAbstract from "../util/swr"

export default function Cluster(props) {
    const id = props.id.split("%")[0];
    const { cluster } = useSWRAbstract("cluster", `/api/clusters/${id}`);
    const data = cluster?.history[0].included_posts.map((p) => { return [p, 1.0] });
  
    return (
      <div style={{ overflow: "auto", height: "100%" }}>
        <PostList 
          data={data} 
          pagination={true} 
          showClusterIcon={false} 
          showOrientIcon={true} 
          showRemoveIcon={true}
          cluster={cluster}
        ></PostList>
      </div>
    )
}