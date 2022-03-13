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

export default function WorkspaceItem(props) {
  const classes = useStyles();
  const container = React.useRef(null);
  const dispatch = useDispatch();
  const favs = useSelector((state) => state.faver.value);
  const faved = favs.includes(props.id);
  const [open, setOpen] = React.useState(false);

  const [viewMore, setViewMore] = React.useState(false);
  const [checked, setChecked] = React.useState(false);

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
          maxWidth: 230,
          // height: 120,
        }}
      >
        <Checkbox
          size="small"
          checked={checked}
          onChange={handleChange}
          inputProps={{ "aria-label": "controlled" }}
          style={{ marginRight: 10 }}
        />
        Title
        <div style={{ display: "flex", float: "right" }}>
          <IconButton size="small" onClick={handleClick}>
            {open ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
          <IconButton size="small" onClick={handleDelete}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
        <Collapse timeout="auto" unmountOnExit in={open}>
          <p style={{ marginLeft: 30 }}>Content</p>
          <button
            style={{
              backgroundColor: "white",
              borderWidth: 0,
              textDecoration: "underline",
              margin: "auto",
              display: "block",
            }}
          >
            {viewMore ? "View Less" : "View More"}
          </button>
        </Collapse>
      </Card>
    </Draggable>
  );
}
