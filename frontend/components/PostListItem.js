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

// icons
import IconButton from "@material-ui/core/IconButton";
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
import Telescope from "../public/telescope.png";
import ClearIcon from "@mui/icons-material/Clear";

// actions
import { useSelector, useDispatch } from "react-redux";
import { fav } from "../actions/fav";
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
    maxWidth: 290,
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

export default function QueryListItem(props) {
  const classes = useStyles();
  const { post, loading, error } = usePost(props.id);
  const container = React.useRef(null);
  const dispatch = useDispatch();
  const favs = useSelector((state) => state.faver.value);
  const faved = favs.includes(props.id);
  const [open, setOpen] = React.useState(false);

  const handleClick = () => {
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

  return (
    <>
      {props.workspace ? (
        <Draggable>
          <ListItem
            style={{ backgroundColor: "#ffffff" }}
            className={classes.root}
            onMouseEnter={() => props.hover(true)}
            onMouseLeave={() => props.hover(false)}
            disableGutters={true}
            onClick={handleClick}
          >
            <ListItemText onClick={() => props.handleOpenClick(props.id)}>
              {post ? postTitle(post) : "Post loading..."}
            </ListItemText>
            {open ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          {/* <div>
            <button
              style={{
                marginBottom: 10,
                marginLeft: 20,
                width: 50,
                backgroundColor: "white",
              }}
            >
              <img src={Telescope} alt="Telescope logo" style={{ width: 20 }} />
            </button>
            <ul
              style={{
                backgroundColor: "#f2f2f2",
                color: "black",
                // border: isDragging ? "2px solid red" : "1px solid black",
                width: "100px",
                height: "7=60px",
              }}
            >
              text
              <IconButton>
                <ClearIcon />
              </IconButton>
            </ul>
          </div> */}
        </Draggable>
      ) : (
        <div ref={drag}>
          <ListItem
            button
            className={classes.root}
            onMouseEnter={() => props.hover(true)}
            onMouseLeave={() => props.hover(false)}
            disableGutters={true}
            onClick={handleClick}
          >
            <ListItemIcon>
              <IconButton
                aria-label="add to favorites"
                onClick={() => dispatch(fav(props.id))}
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
            <ListItemIcon>
              <IconButton onClick={() => dispatch(hide(props.id))}>
                <VisibilityOffIcon style={{ fontSize: 20 }} />
              </IconButton>
            </ListItemIcon>
            {open ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse timeout="auto" unmountOnExit in={open}>
            <List disablePadding>
              <ListItem>
                <ListItemText
                  primary="content: dummy test"
                  style={{ marginLeft: 50 }}
                />
              </ListItem>
            </List>
          </Collapse>
        </div>
      )}
    </>
  );
}
