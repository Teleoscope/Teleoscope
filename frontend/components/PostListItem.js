import React, { useState } from "react";
import useSWR from "swr";

// material ui
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";

// actions
import { useSelector, useDispatch } from "react-redux";
import { dragged } from "../actions/windows";

// custom
import GroupSelector from "./GroupSelector";
import BookmarkSelector from "./BookmarkSelector";
import PostTitle from './PostTitle';
import Expander from "./Expander";

const useStyles = makeStyles((theme) => ({
  margin: {
    margin: theme.spacing(1),
    padding: 5,
  },
  extendedIcon: {
    marginRight: theme.spacing(1),
  },
  floater: {
    position: "absolute",
    top: "10px",
  },
  itemAlign: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
  },
}));


function usePost(postid) {
  const { data, error } = useSWR(`/api/posts/${postid}`);
  return {
    post: data,
    loading: !error && !data,
    error: error,
  };
}




export default function PostListItem(props) {
  const classes = useStyles();
  const { post, loading, error } = usePost(props.id);
  const dispatch = useDispatch();

  return (

    <div
      draggable={true}
      className="droppable-element"
      style={{ borderBottom: "1px solid  #eceeee" }}
      id={props.id}
      onDragStart={(e, data) => { dispatch(dragged(props.id)) }}
    >
      <Grid container spacing={2}>
        <Grid item xs={1}>
          <BookmarkSelector id={props.id} />
        </Grid>
        <Grid item xs={2}>
          <GroupSelector id={props.id} />
        </Grid>
        <Grid item xs={7}>
          <PostTitle post={post ? post : {}} />
        </Grid>
        <Grid item xs={12}>
          <Expander post={post ? post : {}} />
        </Grid>
      </Grid>
    </div>
  );
}
