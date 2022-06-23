import React, { useState } from "react";
import useSWR, { mutate } from "swr";

// material ui
import { makeStyles } from "@material-ui/core/styles";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
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


export default function WorkspaceItem(props) {
  const container = React.useRef(null);
  const dispatch = useDispatch();

  const [open, setOpen] = React.useState(false);
  const [viewMore, setViewMore] = React.useState(false);

  const { post, loading, error } = usePost(props.id);

  return (
    <Grid container spacing={2}>
      <Grid item xs={1}>
        <GroupSelector id={props.id}/>
      </Grid>
      <Grid item xs={10}>
        <PostTitle post={post ? post : {}}/>
      </Grid>
      <Grid item xs={1}>
          <IconButton size="small" onClick={() => dispatch(removeWindow(props.id))}>
            <CloseIcon fontSize="small" />
          </IconButton>
      </Grid>

      <Grid item xs={12}>
        <PostText text={post ? post["selftext"] : "Content not available"}></PostText>
      </Grid>
    </Grid>
    );
}
