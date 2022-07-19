import React, { useState, useEffect, useRef } from 'react';
import useDimensions from "react-cool-dimensions";

// material ui
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Stack from '@mui/material/Stack';
import Grid from "@mui/material/Grid";
import CardActionArea from '@mui/material/CardActionArea';
import Box from '@mui/material/Box';

// icons
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";

// actions
import { useSelector, useDispatch } from "react-redux"
import { dragged, loadWindows } from "../actions/windows";
import { checker } from "../actions/checkedPosts";

// custom components
import PostTitle from "./PostTitle"
import PostText from "./PostText"
import GroupSelector from "./GroupSelector"
import Expander from "./Expander"
import CloseButton from "./CloseButton"
import NoteButton from "./NoteButton"

//utils
import useSWRAbstract from "../util/swr"


export default function WorkspaceItem(props) {
  // strangely, this is needed
  const handleClick = (id, index) => {
    if (index < 0) {
      dispatch(checker(id))
    } else {
      dispatch(checker(id))
    }
  }
  const container = React.useRef(null);
  const dispatch = useDispatch();
  const checked = useSelector((state) => state.checkedPosts.value);
  const windows = useSelector((state) => state.windows.windows)

  const [open, setOpen] = React.useState(false);
  const [viewMore, setViewMore] = React.useState(false);

  const { post, post_loading, post_error } = useSWRAbstract("post", `/api/posts/${props.id}`);

  // props checked
  var pc = checked.indexOf(props.id)
  //window
  var w = windows.find(i => i.i == props.id);

  // Todo: make this conversion automatic
  const cw = 6.25 // column width in em at 16pts, 6.25 = 100px

  // Layout small
  if (w.h == 1) {
    return (
    <Stack direction="row" justifyContent="space-between">
        {/* <div style={{paddingTop:"100px" }}>hi</div> */}
        <GroupSelector id={props.id}/>

        <GroupSelector id={props.id} />

        <div style={{ width: w.w == 1 ? 3 * cw : ((w.w * cw) - cw) + "em", marginTop: "0.25em" }}>
          <CardActionArea onClick={() => handleClick(props.id, pc)}>
            <PostTitle post={post} noWrap={true} />
          </CardActionArea>
        </div>

        <CloseButton id={props.id} />
      </Stack>
    )
  }

  // Layout large
  return (
    // <div style={{ overflow: "auto", height: "100%" }}>
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Stack direction="row" justifyContent="space-between">
          <GroupSelector id={props.id} />

          <CardActionArea className="drag-handle" onClick={() => handleClick(props.id, pc)}>
            <PostTitle post={post} noWrap={false} />
          </CardActionArea>

          <NoteButton id={props.id} />
          <CloseButton id={props.id} />
        </Stack>
      </Grid>
      <Grid item xs={12}>
        <Box style={{ maxHeight: '100vh', overflow: 'scroll' }}>
          <PostText post={post}></PostText>
        </Box>
      </Grid>
    </Grid>
    // </div>
  );
}
