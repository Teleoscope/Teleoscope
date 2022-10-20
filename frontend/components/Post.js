// Window.js
import React from "react";

// custom
import PostText from "./PostText"
import GroupSelector from "./GroupSelector"
import NoteButton from "./NoteButton"

// mui
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

//utils
import useSWRAbstract from "../util/swr"
import { PreprocessText } from "../util/Preprocessers"

export default function Post(props) {
  const id = props.id.split("%")[0];
  const { post } = useSWRAbstract("post", `/api/posts/${id}`);
  const text = post ? PreprocessText(post.selftext) : false;

  return (
    <div style={{ overflow: "auto", height: "100%", marginTop: "0em" }}>

      <Stack direction="row" justifyContent="right" alignItems="center" style={{ margin: 0 }}>
        <NoteButton id={id} />
        <GroupSelector id={id} />
      </Stack>
      <Divider />
      <PostText text={text} />

    </div>
  )
}
