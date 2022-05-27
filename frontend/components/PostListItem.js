import React, { useState } from "react";
import useSWR from "swr";
import { useDrag } from "react-dnd";

// material ui
import { makeStyles } from "@material-ui/core/styles";
import Collapse from "@material-ui/core/Collapse";
import List from "@mui/material/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from "@mui/material/Paper";
import InputBase from "@mui/material/InputBase";
import Divider from "@mui/material/Divider";

// icons
import FavoriteIcon from "@material-ui/icons/Favorite";
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";
import CloseIcon from "@mui/icons-material/Close";

// actions
import { useSelector, useDispatch } from "react-redux";
import { adder } from "../actions/addtoworkspace";
import { mark } from "../actions/bookmark";
import { blue } from "../actions/tagblue";
import { red } from "../actions/tagred";
import { green } from "../actions/taggreen";

import Note from "./Notes";
import Bookmark from "../actions/bookmark";
import tagBlue from "../actions/tagBlue";
import tagGreen from "../actions/tagGreen";
import tagRed from "../actions/tagRed"

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

const fetcher = (...args) => fetch(...args).then((res) => res.json());

function usePost(postid) {
  const { data, error } = useSWR(`/api/posts/${postid}`, fetcher);
  return {
    post: data,
    loading: !error && !data,
    error: error,
  };
}

var notesInList = [
  // { content: "note 1", id: "1" },
  // { content: "note 2", id: "2" },
  // { content: "note 3", id: "3" },
];
//TODO: Figure out store for notes

export default function QueryListItem(props) {
  const classes = useStyles();
  const { post, loading, error } = usePost(props.id);
  const dispatch = useDispatch();

  const added = useSelector((state) => state.adder.value);
  const bookmarked = useSelector((state) => state.bookmarker.value);
  const rTagged = useSelector((state) => state.redtagger.value);
  const gTagged = useSelector((state) => state.greentagger.value);
  const bTagged = useSelector((state) => state.bluetagger.value);

  const marked = bookmarked.includes(props.id);
  const taggedBlue = bTagged.includes(props.id);
  const taggedGreen = gTagged.includes(props.id);
  const taggedRed = rTagged.includes(props.id);

  const [open, setOpen] = useState(false);
  const [viewMore, setViewMore] = useState(false);

  // Note
  const [note, setNote] = React.useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [index, setIndex] = useState(0);
  const [anchorEl, setAnchorEl] = React.useState(null);

  // methods for the menu functionality 
  const opened = Boolean(anchorEl);

  const handleMouseClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleClick = () => {
    if (!open) setViewMore(false);
    setOpen(!open);
  };

  const documentGroup = () => {
    (!taggedBlue && !taggedRed && !taggedGreen) ? dispatch(mark(props.id)) : null;
    handleClose();
  };

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "item",
    item: { id: props.id },

    //optional to keep track of dragging and access state
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const postTitle = (post) => {
    String.prototype.trimLeft = function (charlist) {
      if (charlist === undefined) charlist = "s";
      return this.replace(new RegExp("^[" + charlist + "]+"), "");
    };
    var regex = new RegExp(
      "(AITA for|aita for|AITA if|WIBTA if|AITA|aita|WIBTA)"
    );
    var title = post["title"].replace(regex, "");
    var charlist = " -";
    title = title.trimLeft(charlist);
    var first = title.slice(0, 1);
    var ret = first.toUpperCase() + title.slice(1);
    return ret;
  };

  // Notes
  const handleNoteSubmit = (e) => {
    e.preventDefault();
    if (noteContent == null || noteContent != "") {
      setIndex(index + 1);
      notesInList.push({ content: noteContent, id: index });
      setNoteContent("");
    }
  };

  return (
    <div ref={drag} style={{ borderBottom: "1px solid  #eceeee" }}>
      <ListItem className={classes.root} disableGutters={true}>
        <ListItemIcon>
          <IconButton
            aria-label="add to bookmarks"
            //onClick={() => dispatch(mark(props.id))}
            aria-controls={open ? 'basic-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
            onClick={handleMouseClick}
          >
            {marked && taggedBlue ? (
                <BookmarkIcon sx={{ color:"#0000FF" }} style={{ fontSize: 20 }} />
            ) : (
              marked && taggedGreen ?  (
                <BookmarkIcon sx={{ color:"#00FF00"}} style={{fontSize: 20}} />
              ) : (
                marked && taggedRed ? (
                  <BookmarkIcon sx={{ color:"#FF0000"}} style={{fontSize: 20}} />
                ) : (
                  <BookmarkIcon style={{ fontSize: 20 }} />
                )
              )
            )}
          </IconButton>
          
          <Menu
            id="basic-menu"
            anchorEl={anchorEl}
            open={opened}
            onClose={handleClose}
            MenuListProps={{
              'aria-labelledby': 'basic-button',
            }}
          >
            <MenuItem onClick={() => {
              if (taggedBlue) dispatch(mark(props.id));
              dispatch(blue(props.id));
              if (taggedRed) dispatch(red(props.id));
              if (taggedGreen) dispatch(green(props.id));
              documentGroup();}}>
                Blue
              </MenuItem>

            <MenuItem onClick={() => {
              if (taggedRed) dispatch(mark(props.id));
              dispatch(red(props.id));
              if (taggedBlue) dispatch(blue(props.id));
              if (taggedGreen) dispatch(green(props.id));
              documentGroup();}}>
                Red
                </MenuItem>

            <MenuItem onClick={() => {
              if (taggedGreen) dispatch(mark(props.id));
              dispatch(green(props.id));
              if (taggedBlue) dispatch(blue(props.id));
              if (taggedRed) dispatch(red(props.id));
              documentGroup();}}>
                Green
                </MenuItem>

            <MenuItem onClick={handleClose}><CloseIcon style={{ fontSize: 20 }} /></MenuItem>
          </Menu>
        </ListItemIcon>
        

        <ListItemText>
          {post ? postTitle(post) : "Post loading..."}
        </ListItemText>

        <IconButton onClick={handleClick}>
          {open ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </ListItem>

      <Collapse timeout="auto" unmountOnExit in={open}>
        <List disablePadding>
          <ListItem
            style={
              viewMore
                ? { display: "inline-block" }
                : {
                  display: "inline-block",
                  overflow: "hidden",
                  textOverflow: "ellipsis [..]",
                  height: 250,
                }
            }
          >
            <ListItemText
              primary={post ? post["selftext"] : "Post content not available"}
              ellipsizeMode="tail"
              style={{
                marginLeft: 50,
                display: "inline-block",
                whiteSpace: "pre-line",
              }}
            />
          </ListItem>

          <Button
            variant="text"
            style={{ fontSize: 11, margin: "0 auto", display: "flex" }}
            onClick={() => setViewMore(!viewMore)}
          >
            {viewMore ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            <div style={{ textDecoration: "underline" }}>
              {viewMore ? "View Less" : "View More"}
            </div>
          </Button>
        </List>

        <Note />
      </Collapse>
    </div>
  );
}
