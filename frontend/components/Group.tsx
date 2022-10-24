import * as React from 'react';

// custom
import PostList from "./PostList"

//utils
import useSWRAbstract from "../util/swr"

export default function Group(props) {
  const id = props.id.split("%")[0];
  const { group } = useSWRAbstract("group", `/api/groups/${id}`);
  const data = group?.history[0].included_posts.map((p) => { return [p, 1.0] });

  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      <PostList 
        data={data} 
        pagination={true} 
        showGroupIcon={false} 
        showOrientIcon={true} 
        showRemoveIcon={true}
        group={group}
      ></PostList>
    </div>
  );
}