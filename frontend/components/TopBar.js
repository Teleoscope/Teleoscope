import React, { useContext } from "react";
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';

// material ui
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { Typography } from '@mui/material';
import { Divider } from '@mui/material';
import { alpha } from "@mui/material";
import { IconButton } from '@mui/material';

import AccountCircle from '@mui/icons-material/AccountCircle';
import Flare from '@mui/icons-material/Flare';


// actions
import { useSelector, useDispatch } from "react-redux";
import { sessionActivator } from "../actions/activeSessionID";
import { loadWindows } from "../actions/windows";
import { loadBookmarkedPosts } from "../actions/bookmark";
import { getGroups } from "../actions/groups";

// utilities
import {
  save_UI_state,
  initialize_session,
  add_user_to_session
} from "../components/Stomp.ts";

import { useCookies } from "react-cookie";
import useSWRAbstract from "../util/swr"

// contexts
import { StompContext } from '../context/StompContext'

export default function TopBar(props) {

  // const { teleoscopes, loading, error } = useTeleoscopes();
  const { sessions } = useSWRAbstract("sessions", `/api/sessions/`);
  const { users } = useSWRAbstract("users", `/api/users/`);
  const session_id = useSelector((state) => state.activeSessionID.value);
  const { session } = useSWRAbstract("session", `/api/sessions/${session_id}`);
  const [open, toggleOpen] = React.useState(false);
  const [cookies, setCookie] = useCookies(["user"]);

  const windows = useSelector((state) => state.windows.windows); // TODO rename
  const bookmarks = useSelector((state) => state.bookmarker.value);
  const randomName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals], length: 1 });
  const randomColor = require('randomcolor');
  const client = useContext(StompContext)


  const [anchorEl, setAnchorEl] = React.useState(null);
  const openMenu = Boolean(anchorEl);
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCookie = (username) => {
    setCookie("user", username, {
      path: "/"
    });
    console.log(`Set username to ${username}.`);
  }

  const dispatch = useDispatch();

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

  const getUsers = () => {
    if (session) {
      var userlist = Object.keys(session.userlist)
      return users.map((u) => {
        if (!userlist.includes(u.username)) {
          return (<MenuItem value={u}>{u.username}</MenuItem>)
        }
      })
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


  const get_label = () => session.history[0].label;
  const get_color = () => session ? session.history[0].color : "#4E5CBC"


  const [dialogValue, setDialogValue] = React.useState({
    label: '',
  });

  const handleClickOpen = () => {
    toggleOpen(true);
    handleMenuClose()
  };

  const handleClose = () => {
    setDialogValue({
      label: '',
    });
    toggleOpen(false);
  };

  const Account = () => {
    return (
      <TextField
        id="input-with-icon-textfield"
        sx={{ width: 200, backgroundColor: alpha('#FFFFFF', 0.0), }}
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
    )
  }

  const Session = () => {
    return (

      <FormControl
        sx={{ width: 200, backgroundColor: alpha('#FFFFFF', 0.0) }}
        variant="filled"
      >
        <InputLabel id="demo-simple-select-label">Session</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          // value={session_id}
          label="Session ID"
          size="small"
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
    )
  }

  const AddUserDialogue = () => {
    return (
        <Dialog disableEscapeKeyDown open={open} onClose={handleClose}>
          <DialogTitle>Collaborate with User</DialogTitle>
          <DialogContent>
            <Box component="form" sx={{ display: 'flex', flexWrap: 'wrap' }}>
              <FormControl
                sx={{ width: 200, backgroundColor: 'white', }}
                variant="filled"
              >
                <InputLabel id="demo-simple-select-label">User</InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  onChange={(event) =>
                    setDialogValue({
                      label: event.target.value.username,
                    })
                  }
                >
                  {getUsers()}

                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              type="submit"
              onClick={() => {
                add_user_to_session(client, cookies.user, dialogValue.label, session_id)
                handleClose()
              }
              }>Add</Button>
          </DialogActions>
        </Dialog>
    )
  }

  const handleSaveUIState = () => {
      if (session) {
        save_UI_state(
          client,
          cookies.user,
          session_id,
          bookmarks,
          windows,
        )
      }
      else {
        console.log(`No session selected. Do nothing`);
      }
      handleMenuClose()
  }

  return (
      <AppBar position="static" style={{ backgroundColor: get_color(), width: "100%" }}>
        <Toolbar >
          <Stack spacing={10} sx={{width: "100%"}} direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center">
              <Flare></Flare>
              <Typography variant="h5" sx={{fontWeight: 'fontWeightLight' , fontFamily: "monospace"}}>Teleoscope</Typography>
            </Stack>
            <Stack spacing={1} direction="row-reverse">
              <IconButton
                id="bIconasic-button"
                aria-controls={open ? 'basic-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                onClick={handleMenuClick}
              >
                <AccountCircle></AccountCircle>
              </IconButton>
              <Menu
                id="basic-menu"
                anchorEl={anchorEl}
                open={openMenu}
                onClose={handleMenuClose}
                MenuListProps={{
                  'aria-labelledby': 'basic-button',
                }}
              >
                <MenuItem><Account /></MenuItem>
                <MenuItem><Session /></MenuItem>
                <Divider></Divider>
                <MenuItem onClick={handleClickOpen}>Add User to Session</MenuItem>
                <MenuItem onClick={handleSaveUIState}>Save UI State</MenuItem>
              </Menu>
              <AddUserDialogue />
            </Stack>
          </Stack>
        </Toolbar>
      </AppBar>
  );
}
