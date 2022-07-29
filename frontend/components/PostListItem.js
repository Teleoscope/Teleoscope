import React, { useState } from "react";
import useSWR from "swr";

// material ui
import Grid from "@mui/material/Grid";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import IconButton from "@mui/material/IconButton";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
// actions
import { useSelector, useDispatch } from "react-redux";
import { dragged } from "../actions/windows";

// custom
import GroupSelector from "./GroupSelector";
import BookmarkSelector from "./BookmarkSelector";
import PostTitle from './PostTitle';
import Expander from "./Expander";


//utils
import useSWRAbstract from "../util/swr"


export default function PostListItem(props) {
  const { post, post_loading, post_error } = useSWRAbstract("post", `/api/posts/${props.id}`);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);

  return (

    <div
      draggable={true}
      className="droppable-element"
      style={{ borderBottom: "1px solid  #eceeee" }}
      id={props.id}
      onDragStart={(e, data) => {dispatch(dragged({id: props.id, type: "Post"}))}}
    >
      <Grid container spacing={2}>
        <Grid item xs={1}>
          <BookmarkSelector id={props.id} />
        </Grid>
        <Grid item xs={2}>
          <GroupSelector id={props.id} />
        </Grid>
        <Grid item xs={7}>
          <PostTitle title={post ? post.title : "" } noWrap={false} />
        </Grid>
        <Grid item xs={2}>
          <IconButton onClick={() => setOpen(!open)}>
            {open ? <ExpandLess /> : <ExpandMore />}
         </IconButton> 
        </Grid>
        <Grid item xs={10}>
          {open ? <Expander post={post ? post : {}} /> : ""}
        </Grid>
        
      </Grid>
    </div>
  );
}
