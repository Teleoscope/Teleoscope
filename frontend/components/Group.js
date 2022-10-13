import * as React from 'react';

// mui
import IconButton from '@mui/material/IconButton';
import TopicIcon from '@mui/icons-material/Topic';
import Tooltip from '@mui/material/Tooltip';

// custom
import PostList from "../components/PostList"

//utils
import useSWRAbstract from "../util/swr"

export default function Group(props) {
  const id = props.id.split("%")[0];
  const { group } = useSWRAbstract("group", `/api/groups/${id}`);
  const color = group?.color;
  const label = group?.label;
  console.log("groupy", group, label, color)
  const data = group?.history[0].included_posts.map((p) => { return [p, 1.0] });

  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      <PostList data={data} pagination={true}></PostList>
    </div>
  );
}