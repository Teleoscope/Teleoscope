import * as React from 'react';

// custom
import DocumentList from "./Documents/DocumentList"

//utils
import useSWRAbstract from "../util/swr"

export default function Group(props) {
  const id = props.id.split("%")[0];
  const { group } = useSWRAbstract("group", `/api/groups/${id}`);
  const data = group?.history[0].included_documents.map((p) => { return [p, 1.0] });

  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      <DocumentList 
        data={data} 
        pagination={true} 
        showGroupIcon={false} 
        showOrientIcon={true} 
        showRemoveIcon={true}
        group={group}
        ShowDeleteIcon={true}
      ></DocumentList>
    </div>
  );
}