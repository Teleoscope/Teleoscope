import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import CssBaseline from "@material-ui/core/CssBaseline";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import Paper from "@material-ui/core/Paper";
import Fab from "@material-ui/core/Fab";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemText from "@material-ui/core/ListItemText";
import ListSubheader from "@material-ui/core/ListSubheader";
import Avatar from "@material-ui/core/Avatar";
import MenuIcon from "@material-ui/icons/Menu";
import AddIcon from "@material-ui/icons/Add";
import SearchIcon from "@material-ui/icons/Search";
import MoreIcon from "@material-ui/icons/MoreVert";

const useStyles = makeStyles((theme) => ({
  text: {
    padding: theme.spacing(2, 2, 0),
  },
  paper: {
    paddingBottom: 50,
  },
  list: {
    marginBottom: theme.spacing(2),
  },
  subheader: {
    backgroundColor: theme.palette.background.paper,
  },
  appBar: {
    top: "auto",
    bottom: 0,
  },
  grow: {
    flexGrow: 1,
  },
  fabButton: {
    position: "absolute",
    zIndex: 1,
    top: -30,
    left: 0,
    right: 0,
    margin: "0 auto",
  },
}));

export default function BottomAppBar(props) {
  const classes = useStyles();

  return (
    <React.Fragment>
      <CssBaseline />

      <AppBar position="fixed" color="primary" className={classes.appBar}>
        <Toolbar>
          <IconButton edge="start" color="inherit" aria-label="open drawer">
            <MenuIcon />
          </IconButton>
          <Fab
            color="secondary"
            aria-label="add"
            className={classes.fabButton}
            onClick={props.callback}
          >
            <AddIcon />
          </Fab>
          <div className={classes.grow} />
          <IconButton color="inherit">
            <SearchIcon />
          </IconButton>
          <IconButton edge="end" color="inherit">
            <MoreIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
    </React.Fragment>
  );
}
