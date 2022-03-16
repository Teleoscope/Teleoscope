import React, { useState } from "react";
import useSWR, { mutate } from "swr";
import clsx from "clsx";
import Draggable from "react-draggable";
import { useDrag } from "react-dnd";

// material ui
import { makeStyles } from "@material-ui/core/styles";
import { spacing } from "@material-ui/system";
import Collapse from "@material-ui/core/Collapse";
import Avatar from "@material-ui/core/Avatar";
import Typography from "@material-ui/core/Typography";
import { red } from "@material-ui/core/colors";
import List from "@mui/material/List";
import ListItem from "@material-ui/core/ListItem";
import Grid from "@material-ui/core/Grid";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import InputBase from "@mui/material/InputBase";
import Divider from "@mui/material/Divider";

// icons
import FavoriteIcon from "@material-ui/icons/Favorite";
import ShareIcon from "@material-ui/icons/Share";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import ViewCompactIcon from "@material-ui/icons/ViewCompact";
import CancelIcon from "@material-ui/icons/Cancel";
import DeleteIcon from "@material-ui/icons/Delete";
import VisibilityOffIcon from "@material-ui/icons/VisibilityOff";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ClearIcon from "@mui/icons-material/Clear";
import BiotechIcon from "@mui/icons-material/Biotech";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";
import CloseIcon from "@mui/icons-material/Close";
import MinimizeIcon from "@mui/icons-material/Minimize";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

// actions
import { useSelector, useDispatch } from "react-redux";
import { favs } from "../actions/fav";
import { adder } from "../actions/addtoworkspace";
import { hide } from "../actions/hide";

const useStyles = makeStyles((theme) => ({
  margin: {
    margin: theme.spacing(1),
    padding: 5,
  },
  extendedIcon: {
    marginRight: theme.spacing(1),
  },
  idlist: {
    // overflow: "scroll",
    // maxHeight: "200px",
  },
  floater: {
    position: "absolute",
    top: "10px",
  },
  root: {
    // margin: 5,
    // maxWidth: 290,
    // maxHeight: 200,
    // overflow: "hidden",
  },
  title: {
    // border: "1px solid #ffffff",
    // borderRadius:5,
    // "&:hover" :{
    //   border: "1px solid #eeeeee",
    // backgroundColor: "red",
    // },
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
  { content: "note 1", id: "1" },
  { content: "note 2", id: "2" },
  { content: "note 3", id: "3" },
];
//TODO: Figure out store for notes

export default function QueryListItem(props) {
  const classes = useStyles();
  const { post, loading, error } = usePost(props.id);
  const container = React.useRef(null);
  const dispatch = useDispatch();

  const added = useSelector((state) => state.adder.value);
  const faved = added.includes(props.id);

  const [open, setOpen] = React.useState(false);
  const [viewMore, setViewMore] = React.useState(false);

  // Note
  const [note, setNote] = React.useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [index, setIndex] = useState(0);

  const handleClick = () => {
    if (!open) setViewMore(false);
    setOpen(!open);
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

  const postContent = (post) => {
    var text = post["selftext"].slice(0, 1000);
    return text;
  };

  // Notes
  const handleNoteSubmit = (e) => {
    console.log("add!");
    e.preventDefault();
    setIndex(index + 1);
    notesInList.push({ content: noteContent, id: index });
    console.log("added notes:", notesInList);
    setNoteContent("");
  };

  return (
    <div ref={drag} style={{ borderBottom: "1px solid  #eceeee" }}>
      <ListItem
        className={classes.root}
        onMouseEnter={() => props.hover(true)}
        onMouseLeave={() => props.hover(false)}
        disableGutters={true}
      >
        <ListItemIcon>
          <IconButton
            aria-label="add to favorites"
            onClick={() => dispatch(adder(props.id))}
          >
            {faved ? (
              <FavoriteIcon color="secondary" style={{ fontSize: 20 }} />
            ) : (
              <FavoriteIcon style={{ fontSize: 20 }} />
            )}
          </IconButton>
        </ListItemIcon>
        <ListItemText onClick={() => props.handleOpenClick(props.id)}>
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
                ? {
                    display: "inline-block",
                  }
                : {
                    display: "inline-block",
                    overflow: "hidden",
                    textOverflow: "ellipsis [..]",
                    height: 250,
                  }
            }
          >
            <ListItemText
              primary={post ? postContent(post) : ""}
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
        <div style={{ justifyContent: "center" }}>
          {notesInList.length != 0 ? (
            <h4 style={{ textAlign: "center", margin: 2 }}>Notes</h4>
          ) : null}
        </div>
        {notesInList.map((note) => {
          return (
            <div style={{ padding: "10px 15px 0px 15px", fontSize: 14 }}>
              {note.content}
              <Divider style={{ marginTop: 10 }} />
            </div>
          );
        })}
        <div style={{ float: "right" }}>
          <IconButton
            size="small"
            style={{
              marginRight: 10,
              marginBottom: 10,
            }}
            onClick={() => setNote(!note)}
          >
            {note ? <CloseIcon /> : <BorderColorOutlinedIcon />}
          </IconButton>
        </div>
        {note ? (
          <div style={{ width: "100%", paddingLeft: 10, marginBottom: 10 }}>
            <Paper
              component="form"
              sx={{
                p: "2px 4px",
                display: "flex",
                alignItems: "start",
                width: "95%",
                height: "80px",
              }}
            >
              <InputBase
                style={{ fontSize: 14, color: "black" }}
                sx={{ ml: 1, flex: 1 }}
                placeholder="Add notes"
                value={noteContent}
                inputProps={{ "aria-label": "Add notes" }}
                onChange={(e) => setNoteContent(e.target.value)}
              />
            </Paper>
            <div style={{ width: "95%" }}>
              <Button
                onClick={handleNoteSubmit}
                type="submit"
                sx={{
                  p: "5px",
                  fontSize: 12,
                  backgroundColor: "#666666",
                  float: "right",
                  marginBottom: 1,
                }}
                aria-label="search"
                variant="contained"
              >
                Submit
              </Button>
            </div>
          </div>
        ) : null}
      </Collapse>
    </div>
  );
}
