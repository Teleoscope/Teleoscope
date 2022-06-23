import React, { useState, useEffect, useRef } from 'react';
import useSWR from "swr";
import useDimensions from "react-cool-dimensions";

// material ui
import { makeStyles } from "@material-ui/core/styles";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Stack from '@mui/material/Stack';
import Grid from "@material-ui/core/Grid";

// icons
import CloseIcon from "@mui/icons-material/Close";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";

// actions
import { useSelector, useDispatch } from "react-redux"
import { removeWindow } from "../actions/windows";

// custom components
import PostTitle from "./PostTitle"
import PostText from "./PostText"
import GroupSelector from "./GroupSelector"
import Expander from "./Expander"


function usePost(postid) {
  const { data, error } = useSWR(`/api/posts/${postid}`);
  return {
    post: data,
    loading: !error && !data,
    error: error,
  };
}

function getsize(w) {
  if (w < 300) {
    return "xs"
  }
  if (w < 300) {
    return "sm"
  }
  if (w < 300) {
    return "md"
  }
  if (w < 500) {
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

  const size = getsize(width);
  const container = React.useRef(null);
  const dispatch = useDispatch();

  const [open, setOpen] = React.useState(false);
  const [viewMore, setViewMore] = React.useState(false);

  const { post, loading, error } = usePost(props.id);


  return (
    <Grid container spacing={2} ref={observe}>
      <Grid item xs={12}>
        <Stack direction="row">
          <GroupSelector id={props.id}/>
          <PostTitle post={post ? post : {}} size="sm"/>
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
