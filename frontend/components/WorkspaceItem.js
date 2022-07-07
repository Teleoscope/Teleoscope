import React, { useState, useContext, useEffect, useRef } from 'react';
import useDimensions from "react-cool-dimensions";

// material ui
import { makeStyles } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Stack from '@mui/material/Stack';
import Grid from "@mui/material/Grid";
import CardActionArea from '@mui/material/CardActionArea';

// icons
import CloseIcon from "@mui/icons-material/Close";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";
import CreateIcon from '@mui/icons-material/Create';

// actions
import { useSelector, useDispatch } from "react-redux"
import { dragged, addWindow, removeWindow, loadWindows } from "../actions/windows";
import { checker } from "../actions/checkedPosts";

// custom components
import PostTitle from "./PostTitle"
import PostText from "./PostText"
import GroupSelector from "./GroupSelector"
import Expander from "./Expander"

//utils
import useSWRAbstract from "../util/swr"
import { add_note } from "../components/Stomp.js";

// contexts
import { StompContext } from '../context/StompContext'

function getSize(w) {
  if (w < 100) {
    return "xs"
  }
  if (w < 200) {
    return "sm"
  }
  if (w < 300) {
    return "md"
  }
  if (w < 400) {
    return "lg"
  }
  return "xl"
}


export default function WorkspaceItem(props) {
  const { observe, unobserve, width, height, entry } = useDimensions({
    // Triggered whenever the size of the target is changed...
    onResize: ({ observe, unobserve, width, height, entry }) => {
        unobserve(); // To stop observing the current target element
        observe(); // To re-start observing the current target element
    },
  });

  // strangely, this is needed
  const handleClick = (id, index) => {
    if (index < 0) {
      dispatch(checker(id))
    } else {
      dispatch(checker(id))
    }
  }

  const handleAddNote = () => {
    dispatch(addWindow({i: props.id + "%note", x: 0, y: 0, w: 3, h: 3, type: "Note"}));
    add_note(client, props.id);
  }

  const size = getSize(width);
  const container = React.useRef(null);
  const dispatch = useDispatch();
  const checked = useSelector((state) => state.checkedPosts.value);

  const [open, setOpen] = React.useState(false);
  const [viewMore, setViewMore] = React.useState(false);

  const { post, post_loading, post_error } = useSWRAbstract("post", `/api/posts/${props.id}`);

  var pc = checked.indexOf(props.id)
  const client = useContext(StompContext)

  const getWidth = () => {
    if (size == "xs") {
      return width/20 + "px";
    } else if (size == "sm") {
      return width/10 + "px";
    } else  if (size == "md") {
      return width/2 + "px";
    } else {
      return width / 1.5 + "px";
    }
  }

  return (
    <Grid container spacing={2} ref={observe}>
      <Grid item xs={12}>
        <Stack 
          direction="row"
          justifyContent="space-between"

        >
          <GroupSelector id={props.id}/>
          <div style={{width: getWidth()}}>
          <CardActionArea onClick={() => handleClick(props.id, pc)}>
            <PostTitle 
              post={post ? post : {}} 
              size="sm" 
              noWrap={true}
              
            />  
          </CardActionArea>
          </div>
          <IconButton onClick={() => handleAddNote()}>
            <CreateIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => dispatch(removeWindow(props.id))}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Grid>
      <Grid item xs={12}>
        <PostText text={post ? post["selftext"] : "Content not available"}></PostText>
      </Grid>
    </Grid>
    );
}
