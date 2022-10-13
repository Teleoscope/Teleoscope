import React, { useState, useContext } from "react";
import useSWR, { mutate } from "swr";
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';

// material ui
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import BiotechIcon from "@mui/icons-material/Biotech";
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import AccountCircle from '@mui/icons-material/AccountCircle';
import InputAdornment from '@mui/material/InputAdornment';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import OutlinedInput from '@mui/material/OutlinedInput';

// actions
import { useSelector, useDispatch } from "react-redux";
import { sessionActivator, loadActiveSessionID } from "../actions/activeSessionID";
import { historyActivator, loadActiveHistoryItem } from "../actions/activeHistoryItem";
import { dragged, addWindow, removeWindow, loadWindows } from "../actions/windows";
import { mark, loadBookmarkedPosts } from "../actions/bookmark";
import { getGroups } from "../actions/groups";

// utilities
import {
    reorient,
    initialize_teleoscope,
    save_UI_state,
    save_teleoscope_state,
    load_teleoscope_state,
    initialize_session,
    add_group,
    add_user_to_session
} from "../components/Stomp.ts";

import { useCookies } from "react-cookie";
import useSWRAbstract from "../util/swr"

// contexts
import { StompContext } from '../context/StompContext'

export default function TopBar(props) {

  // const { teleoscopes, loading, error } = useTeleoscopes();
  const { sessions, sessions_loading, sessions_error } = useSWRAbstract("sessions", `/api/sessions/`);
  const { users, users_loading, users_error } = useSWRAbstract("users", `/api/users/`);
  const session_id = useSelector((state) => state.activeSessionID.value);
  const { session, session_loading, session_error } = useSWRAbstract("session", `/api/sessions/${session_id}`);
  const [value, setValue] = React.useState(null);
  const [open, toggleOpen] = React.useState(false);
  const [cookies, setCookie] = useCookies(["user"]);

  const windows = useSelector((state) => state.windows.windows); // TODO rename
  const bookmarks = useSelector((state) => state.bookmarker.value);
  const randomName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals], length: 1 });
  const randomColor = require('randomcolor');
  const client = useContext(StompContext)

  const handleCookie = (username) => {
    setCookie("user", username, {
      path: "/"
    });
    console.log(`Set username to ${username}.`);
  }

  const dispatch = useDispatch();

  const getTeleoscopes = () => {
    if (teleoscopes && session) {
      var ts = teleoscopes.filter((t) => {
        return session["teleoscopes"].includes(t._id)
      });
      if (ts.length > 0 ) {
        return ts.map((t) => {
          var latest_t = t['history'][0];
          return (<MenuItem value={t["_id"]}>{latest_t["label"]}</MenuItem>)
        });
      }
    }
    return (<MenuItem>No Teleoscopes started for this session...</MenuItem>)
  }
  
  const handleSessionChange = (event) => {
    dispatch(sessionActivator(event.target.value))
    dispatch(getGroups(event.target.value))
  }

  const getSessions = (username) => {
      if (sessions && users) {
        for (const i in users) {
          var user = users[i];
          if (user["username"] == username && user["sessions"].length > 0) {
            return user["sessions"].map((s) => {
                var temp = sessions.find(ss => ss._id == s)
                return (<MenuItem value={s}>{temp?.history[0].label}</MenuItem>)
              })
          }
        }
      }
      return (
          <MenuItem value={"No sessions for this user..."}>No sessions for this user...</MenuItem>
      )
  }

  const getUsers = (username) => {
      if (session) {
          for (const i in users) {
              var user = users[i];
              if (user["username"] != username) {
                  return (<MenuItem value={user}>{user["username"]}</MenuItem>)
              }
          }
      }
      return (
          <MenuItem value={"No session selected..."}>No session selected...</MenuItem>
      )
  }

  const load_UI_state = () => {

    var history_item = session.history[0];
    dispatch(loadBookmarkedPosts(history_item["bookmarks"]));
    dispatch(loadWindows(history_item["windows"]));
  }

  const get_label = () => {
      return session.history[0].label;
  }

  const get_color = () => {
    console.log("Session color", session)
    if (session) {
      return session.history[0].color
    }
    return "#4E5CBC"
  }
  
  


  const [dialogValue, setDialogValue] = React.useState({
      label: '',
  });

  const handleClickOpen = () => {
      toggleOpen(true);
  };

  const handleClose = () => {
        setDialogValue({
            label: '',
        });
        toggleOpen(false);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        style={{ height: 60, backgroundColor: get_color(cookies.user) }} // TODO : background color should reflect session color
      >
        <Toolbar sx={{}} >
          <Stack spacing={1} direction="row">


            <TextField
              id="input-with-icon-textfield"
              sx={{width: 200, backgroundColor: 'white', }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountCircle />
                  </InputAdornment>
                ),
              }}
              label="Username"
              variant="standard"
              defaultValue={cookies.user}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleCookie(e.target.value)
                }
              }}
            />
            <FormControl
              sx={{width: 200, backgroundColor: 'white', }}
              variant="filled"
              >
                <InputLabel id="demo-simple-select-label">Session</InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                // value={session_id}
                label="Session ID"
                onChange={(event) => handleSessionChange(event)}
              >
                {getSessions(cookies.user)}
                <Button
               size="small"
               variant="text"
               onClick={() => initialize_session(client, cookies.user, randomName, randomColor())}
               style={{
                 backgroundColor: "#FFFFFF",
                 color: "black",
                 fontSize: 12,
                 fontWeight: 700,
               }}
             >
               New session
             </Button>
            </Select>
            </FormControl>
              <Button
                  onClick={handleClickOpen}
                  style={{
                  backgroundColor: "#FFFFFF",
                  color: "black",
                  fontSize: 12,
                  fontWeight: 700,
              }}>
                  Add User to Session
              </Button>
              <Dialog disableEscapeKeyDown open={open} onClose={handleClose}>
                  <DialogTitle>Collaborate with User</DialogTitle>
                  <DialogContent>
                      <Box component="form" sx={{ display: 'flex', flexWrap: 'wrap' }}>
                          <FormControl
                              sx={{width: 200, backgroundColor: 'white', }}
                              variant="filled"
                          >
                              <InputLabel id="demo-simple-select-label">User</InputLabel>
                              <Select
                                  labelId="demo-simple-select-label"
                                  id="demo-simple-select"
                                  // value={session_id}
                                  // label="Session ID"
                                  onChange={(event) =>
                                      setDialogValue({
                                          label: event.target.value.username,

                                      })
                                  }
                              >
                                  {getUsers(cookies.user)}

                              </Select>
                          </FormControl>
                      </Box>
                  </DialogContent>
                  <DialogActions>
                      <Button onClick={handleClose}>Cancel</Button>
                      <Button
                          type="submit"
                          onClick={() => {
                              add_user_to_session(client, dialogValue.label, session_id)
                              handleClose()
                          } // add user to userlist
                          }>Add</Button>
                  </DialogActions>
              </Dialog>
              <Button
                  size="small"
                  variant="text"
                  onClick={() => save_UI_state( // could maybe use a check that sees if a session is active
                      client,
                      session_id,
                      { // history_item in save_UI_state in Stomp.js
                          "bookmarks": bookmarks,
                          "windows": windows,
                          "label": get_label(cookies.user),
                          "color": get_color(cookies.user),
                      })
                  }
                  style={{
                      backgroundColor: "#FFFFFF",
                      color: "black",
                      fontSize: 12,
                      fontWeight: 700,
                  }}
              >
                  Save Workspace
              </Button>
          </Stack>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
