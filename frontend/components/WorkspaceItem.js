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
import ListItemText from "@material-ui/core/ListItemText";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";

// icons
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import BiotechIcon from "@mui/icons-material/Biotech";

// actions
import { useSelector, useDispatch } from "react-redux";
import { fav } from "../actions/fav";
import { hide } from "../actions/hide";
import Close from "@mui/icons-material/Close";

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
  draggable: {
    // height: "200px !important",
    // width: "100px !important",
    // display: "flex",
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

export default function WorkspaceItem(props) {
  const classes = useStyles();
  const container = React.useRef(null);
  const dispatch = useDispatch();
  const favs = useSelector((state) => state.faver.value);
  const faved = favs.includes(props.id);
  const [open, setOpen] = React.useState(false);

  const [viewMore, setViewMore] = React.useState(false);
  const [checked, setChecked] = React.useState(false);
  const { post, loading, error } = usePost(props.id);

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

  const handleChange = (event) => {
    setChecked(event.target.checked);
    // add to selected group
    console.log("document selected clicked");
  };

  const handleDelete = () => {
    // TODO
    console.log("close");
  };

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

  return (
    <Draggable className={classes.draggable}>
      <Card
        style={{
          padding: 10,
          borderStyle: "solid",
          borderRadius: 3,
          backgroundColor: "white",
          bortderStyle: "solid",
          borderWidth: checked ? 2 : 0,
          borderColor: checked ? "#4e5cbc" : "white",
          boxShadow: checked ? "1px 1px 8px #888888" : "2px 2px 8px #888888",
          minWidth: 180,
          maxWidth: 290,
          // height: 120,
        }}
      >
        <div>
          <Checkbox
            size="small"
            checked={checked}
            onChange={handleChange}
            inputProps={{ "aria-label": "controlled" }}
            style={{ marginRight: 10 }}
          />
          <div style={{ display: "flex", float: "right" }}>
            <IconButton size="small" onClick={handleClick}>
              {open ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
            <IconButton size="small" onClick={handleDelete}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </div>
        </div>

        <Typography color="text.secondary" gutterBottom>
          {postTitle(post)}
        </Typography>

        <Collapse timeout="auto" unmountOnExit in={open}>
          <p
            style={
              viewMore
                ? {
                    display: "inline-block",
                    fontSize: 13,
                    whiteSpace: "pre-line",
                    marginLeft: 30,
                  }
                : {
                    display: "inline-block",
                    overflow: "hidden",
                    textOverflow: "ellipsis [..]",
                    height: 195,
                    fontSize: 13,
                    whiteSpace: "pre-line",
                    marginLeft: 30,
                  }
            }
          >
            {postContent(post)}
          </p>
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
        </Collapse>
      </Card>
    </Draggable>
  );
}
