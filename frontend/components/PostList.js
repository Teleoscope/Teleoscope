import React from "react";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import clsx from "clsx";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import Input from "@material-ui/core/Input";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import ListItemText from "@material-ui/core/ListItemText";
import Select from "@material-ui/core/Select";
import Checkbox from "@material-ui/core/Checkbox";
import Chip from "@material-ui/core/Chip";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import DeleteIcon from "@material-ui/icons/Delete";
import ArrowDownwardIcon from "@material-ui/icons/ArrowDownward";

import Portal from "@material-ui/core/Portal";
import List from '@material-ui/core/List';

import PostListItem from "../components/PostListItem";

import { useSelector, useDispatch } from 'react-redux'
import {fav} from "../actions/fav"

const useStyles = makeStyles((theme) => ({
  margin: {
    margin: theme.spacing(1),
  },
  extendedIcon: {
    marginRight: theme.spacing(1),
  },
  idlist: {
    // overflow: "auto",
    // maxHeight: "200px",
  },
  floater: {
    position: "absolute",
    top: "10px",
  },
}));

export default function PostList(props) {
  var sortable = props.data
  const classes = useStyles()
  const [show, setShow] = React.useState(true)
  const [postid, setPostID] = React.useState("")
  const container = React.useRef(null)

  const favs = useSelector((state) => state.faver.value)


  const handleOpenClick = (id) => {
    console.log(id)
  };

  const handleCloseClick = (id) => {
    console.log(id)
  };

  const handleHover = (h) => {
    console.log(h) // boolean
  } 
  

  return (
    <List 
      className={classes.idlist}
      dense={true}
    >

    {sortable.map((pair) => {
      let id = pair[0];
      var i_fav = favs.indexOf(id)
      var i_hide = props.hides.indexOf(id)
      var in_favs = i_fav > -1
      var in_hides = i_hide > -1
      return (
        <PostListItem
          id={id}
          key={id + "PostListItem"}
          hover={handleHover}
          handleOpenClick={props.handleOpenClick}
          handleCloseClick={props.handleCloseClick}
          handleHide={props.handleHide} // TODO: migrate this to an action/store design
          fav={in_favs}
        ></PostListItem>
        )
      }
    )
    }
    </List>
  );
}
