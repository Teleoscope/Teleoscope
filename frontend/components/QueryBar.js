import React from "react";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import QueryList from "../components/QueryList";
import Draggable from "react-draggable";

// material ui components
import { makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import InputBase from "@material-ui/core/InputBase";
import IconButton from "@material-ui/core/IconButton";
import EditIcon from "@material-ui/icons/Edit";
import StopIcon from "@material-ui/icons/Stop";
import SearchIcon from "@material-ui/icons/Search";

const useStyles = makeStyles((theme) => ({
  root: {
    // padding: '2px 4px',
    // display: 'flex',
    // alignItems: 'center',
    // width: 200,
    maxWidth: 300,
  },
  input: {
    // marginLeft: theme.spacing(1),
    flex: 1,
    fontSize: 18,
    color: "#000000",
  },
  iconButton: {
    padding: 10,
  },
  divider: {
    height: 28,
    margin: 4,
  },
  bullet: {
    display: "inline-block",
    margin: "0 2px",
    transform: "scale(0.8)",
  },
  title: {
    fontSize: 14,
  },
  pos: {
    marginBottom: 12,
  },
  icon: {
    "&:hover": {
      color: "#f00",
    },
  },
}));




export default function QueryBar(props) {

  const [query, setQuery] = useState("");
  const classes = useStyles();

  const handleSubmit = () => {
    // props.submitCallback(query);
    console.log(query)
  };

  const handleUpdate = (q) => {
    setQuery(q);
    props.updateCallback(q);
  };

  if (!props.clicked || !props.goodResult) {
    return (
      <div>
        <InputBase
          className={classes.input}
          placeholder={props.query}
          inputProps={{ "aria-label": "Query database" }}
          onChange={(e) => handleUpdate(e.target.value)}
        />
        <IconButton
          type="submit"
          className={classes.iconButton}
          aria-label="search"
          onClick={handleSubmit}
        >
          {props.clicked ? <StopIcon /> : <SearchIcon />}
        </IconButton>
      </div>
    );
  } else {
    return (
      <div>
        <div>
          <InputBase
            className={classes.input}
            placeholder={props.query}
            inputProps={{ "aria-label": "Query database" }}
            onChange={(e) => handleUpdate(e.target.value)}
            disabled={true}
          />
          <IconButton
            type="submit"
            className={classes.iconButton}
            aria-label="search"
            onClick={handleSubmit}
          >
            <EditIcon />
          </IconButton>
        </div>
      </div>
    );
  }
}
