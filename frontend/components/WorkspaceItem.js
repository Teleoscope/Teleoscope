import React, { useState } from "react";
import useSWR, { mutate } from "swr";
import clsx from "clsx";
import Draggable from "react-draggable";
import { useDrag } from "react-dnd";

// material ui
import { makeStyles } from "@material-ui/core/styles";
import Collapse from "@material-ui/core/Collapse";
import Typography from "@material-ui/core/Typography";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";

// group imports
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import CircleIcon from '@mui/icons-material/Circle';
import { group } from "../actions/groups";
import { FormControl } from "@material-ui/core";
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';

// icons
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";

// actions
import { useSelector, useDispatch } from "react-redux"
import { adder } from "../actions/addtoworkspace";;
import { checker } from "../actions/checkedPosts";

import Note from "./Notes";

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

// group global function
const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

export default function WorkspaceItem(props) {

  // group variables
  const [menuItem, setMenuItem] = React.useState([]);
  const grouped = useSelector((state) => state.grouper.value);
  const groupLabel = useSelector((state) => state.grouper.groups);

  const classes = useStyles();
  const container = React.useRef(null);
  const dispatch = useDispatch();
  const added = useSelector((state) => state.adder.value); // TODO rename
  const checked = useSelector((state) => state.checkedPosts.value); // TODO rename

  const [open, setOpen] = React.useState(false);
  const [viewMore, setViewMore] = React.useState(false);

  const { post, loading, error } = usePost(props.id);

  const [note, setNote] = React.useState(false);
  const [noteContent, setNoteContent] = useState("");
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
    dispatch(checker(props.id));
    // add to selected group
    console.log("document selected clicked: " + event.target.checked);
  };

  const handleChangeGroups = (event) => {
    const {
      target: { value },
    } = event;
    setMenuItem(
      // On autofill we get a stringified value.
      typeof value === 'string' ? value.split(',') : value,
    );
  };

  const handleDelete = () => {
    dispatch(adder(props.id))
  };

  const postTitle = (post) => {
    if (!post) {
      return "";
    }
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
    if (!post) {
      return "";
    }
    var text = post["selftext"].slice(0, 1000);
    return text;
  };

  // const getLabel = () => {
  //   console.log(props)
  //   console.log(menuItem)
  //   grouped.forEach(element => { 
  //     element.id === props.id ? menuItem.push(element.label) : ( () => {
  //             let index = menuItem.findIndex(props.label)
  //             index > -1 ? menuItem.splice(index, 1) : null})
  //   });
  // }
  const getLabel = () => {
    let menuItems = [];
    grouped.forEach(element => {
      menuItems.push(element.label);
    } )

    return menuItems;
  }

  return (
    <Draggable className={classes.draggable}>
      <Card
        style={{
          padding: 10,
          borderStyle: "solid",
          borderRadius: 3,
          backgroundColor: "white",
          bortderStyle: "solid",
          borderWidth: checked.indexOf(props.id) >= 0  ? 2 : 0,
          borderColor: checked.indexOf(props.id) >= 0 ? "#4e5cbc" : "white",
          boxShadow: checked.indexOf(props.id) >= 0 ? "1px 1px 8px #888888" : "2px 2px 8px #888888",
          minWidth: 180,
          maxWidth: 290,
          // height: 120,
        }}
      >
        <div>
          <FormControl variant="filled" size="small">
            <InputLabel id="demo-simple-select-label" style={{fontSize: 11}}>Group</InputLabel>
            <Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              multiple
              //value={menuItem}
              value={getLabel()}
              onChange={handleChangeGroups}
              input={<OutlinedInput label="Group" />}
              MenuProps={MenuProps}
            >
              {groupLabel.map(labels => ( // if it is the same tag name then only display once
                <MenuItem key={labels.label} value={labels.label} onClick={() => dispatch(group({ id: props.id, label: labels.label }))}>
                  <ListItemIcon>
                    <CircleIcon sx={{ color: labels.color }} style={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary={labels.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Checkbox
            size="small"
            onChange={(e) => handleChange(e)}
            inputProps={{ "aria-label": "controlled" }}
            style={{ marginRight: 10 }}
            checked={checked.indexOf(props.id) >= 0}
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

        <Typography
          color="text.secondary"
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            width: "90%",
            margin: "auto",
          }}
          gutterBottom
        >
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
                    margin: "10px 10px 0px 20px",
                  }
                : {
                    display: "inline-block",
                    overflow: "hidden",
                    textOverflow: "ellipsis [..]",
                    height: 195,
                    fontSize: 13,
                    whiteSpace: "pre-line",
                    margin: "10px 10px 0px 20px",
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
          <Note />
        </Collapse>
      </Card>
    </Draggable>
  );
}
