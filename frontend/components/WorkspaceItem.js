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

// icons

import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import BiotechIcon from "@mui/icons-material/Biotech";

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
    height: "100px !important",
    width: "100px !important",
    display: "flex",
  },
}));

export default function WorkspaceItem(props) {
  const classes = useStyles();
  const container = React.useRef(null);
  const dispatch = useDispatch();
  const favs = useSelector((state) => state.faver.value);
  const faved = favs.includes(props.id);
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(false);

  const [viewMore, setViewMore] = React.useState(false);

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

  const selectDocumentItem = () => {
    setSelected(!selected);
    // add to selected group
    console.log("document selected clicked");
  };

  return (
    <>
      <Draggable
        className={classes.draggable}
        // defaultPosition={{ x: "300", y: "300" }}
      >
        <button
          onClick={() => selectDocumentItem()}
          style={{
            borderStyle: "solid",
            borderRadius: 3,
            backgroundColor: "white",
            bortderStyle: "solid",
            borderWidth: selected ? 3 : 0,
            borderColor: selected ? "#2596be" : "white",
            boxShadow: selected ? "1px 1px 8px #888888" : "2px 2px 8px #888888",
            width: 140,
            height: 120,
          }}
        >
          <div>
            <Typography
              sx={{ fontSize: 12 }}
              color="text.secondary"
              gutterBottom
            >
              Title
            </Typography>
            <Typography variant="body2">
              Content <br />
              {'"description"'}
            </Typography>

            <Button sx={{ fontSize: 12 }}>View More</Button>

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
          {/* {selected ? (
            <IconButton
              size="small"
              style={{
                color: "black",
                position: "absolute",
                marginTop: 18,
                marginLeft: 20,
              }}
            >
              <BiotechIcon />
            </IconButton>
          ) : null} */}
        </button>
      </Draggable>
    </>
  );
}
