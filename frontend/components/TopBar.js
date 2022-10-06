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

// actions
import { useSelector, useDispatch } from "react-redux";
import { sessionActivator, loadActiveSessionID } from "../actions/activeSessionID";
import { historyActivator, loadActiveHistoryItem } from "../actions/activeHistoryItem";
import { dragged, addWindow, removeWindow, loadWindows } from "../actions/windows";
import { mark, loadBookmarkedPosts } from "../actions/bookmark";
import { getGroups } from "../actions/groups";

// utilities
import { reorient, initialize_teleoscope, save_UI_state, save_teleoscope_state, load_teleoscope_state, initialize_session } from "../components/Stomp.js";
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

  const [cookies, setCookie] = useCookies(["user"]);

  const history_item_num = useSelector((state) => state.activeHistoryItem.value);
  const search_term = useSelector((state) => state.searchTerm.value); // TODO rename
  const checked = useSelector((state) => state.checkedPosts.value); // TODO rename
  const windows = useSelector((state) => state.windows.windows); // TODO rename
  const bookmarks = useSelector((state) => state.bookmarker.value);
  const randomName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] }); // big_red_donkey

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
          var latest_t = t['history'][t['history'].length - 1];
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



  const load_UI_state = () => {
    // TODO
    var history_length = session["history"].length;
    var history_item = session["history"][history_length - 1];
    dispatch(loadBookmarkedPosts(history_item["bookmarks"]));
    dispatch(loadWindows(history_item["windows"]));
  }

  const get_label = (username) => {
    return session.history[0].label
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        style={{ height: 60, backgroundColor: "#4E5CBC" }}
      >
        <Toolbar sx={{}} >
          <Stack spacing={1} direction="row">

            <Button 
               size="small"  
               variant="text"  
               onClick={() => save_UI_state( 
                 client,  
                 session_id,  
                 { // history_item in save_UI_state in Stomp.js 
                     "bookmarks": bookmarks, 
                     "windows": windows, 
                     "label": get_label(cookies.user),
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
          {/*   <Button */}
          {/*     size="small"  */}
          {/*     variant="text"  */}
          {/*     onClick={() => load_UI_state()} */}
          {/*     style={{ */}
          {/*       backgroundColor: "#FFFFFF", */}
          {/*       color: "black", */}
          {/*       fontSize: 12, */}
          {/*       fontWeight: 700, */}
          {/*     }} */}
          {/*   > */}
          {/*     Load Workspace */}
          {/*   </Button> */}
          {/*   <Button */}
          {/*     size="small"  */}
          {/*     variant="text"  */}
          {/*     onClick={() => initialize_teleoscope(client, search_term, session_id)} */}
          {/*     style={{ */}
          {/*       backgroundColor: "#FFFFFF", */}
          {/*       color: "black", */}
          {/*       fontSize: 12, */}
          {/*       fontWeight: 700, */}
          {/*     }} */}
          {/*   > */}
          {/*     New Teleoscope */}
          {/*   </Button> */}
          {/*   <FormControl  */}
          {/*     sx={{width: 200, backgroundColor: 'white', }} */}
          {/*     variant="filled" */}
          {/*     > */}
          {/*     <InputLabel id="demo-simple-select-label">Load History Item</InputLabel> */}
          {/*     <Select */}
          {/*       labelId="demo-simple-select-label" */}
          {/*       id="demo-simple-select" */}
          {/*       value={history_item_num} */}
          {/*       label="History Item" */}
          {/*       onChange={(event) => load_teleoscope_state(event.target.value)} */}
          {/*     > */}
          {/*       {!teleoscope_loading && !teleoscope_error ? teleoscope["history"].map((h, i) => { */}
          {/*         return ( */}
          {/*           <MenuItem value={i}>{i}</MenuItem> */}
          {/*       )}):[]} */}
          {/*     </Select> */}
          {/*   </FormControl> */}
          {/*   <Button */}
          {/*     size="small" */}
          {/*     onClick={() => { */}
          {/*       // negative docs array is empty */}
          {/*       reorient(client, search_term, teleoscope_id, checked, []); */}
          {/*       dispatch(uncheckall(teleoscope_id)) */}
          {/*     }} */}
          {/*     style={{ */}
          {/*       backgroundColor: "#FFFFFF", */}
          {/*       color: "black", */}
          {/*       fontSize: 12, */}
          {/*       fontWeight: 700, */}
          {/*     }} */}
          {/*   > */}
          {/*     <BiotechIcon /> */}
          {/*     Orient Towards */}
          {/*   </Button> */}
          {/*   <Button */}
          {/*     size="small" */}
          {/*     onClick={() => { */}
          {/*       // positive docs array is empty */}
          {/*       reorient(client, search_term, teleoscope_id, [], checked); */}
          {/*       dispatch(uncheckall(teleoscope_id)) */}
          {/*     }} */}
          {/*     style={{ */}
          {/*       backgroundColor: "#FFFFFF", */}
          {/*       color: "black", */}
          {/*       fontSize: 12, */}
          {/*       fontWeight: 700, */}
          {/*     }} */}
          {/*   > */}
          {/*     <BiotechIcon /> */}
          {/*     Orient Away */}
          {/*   </Button> */}
          {/*   <FormControl  */}
          {/*     sx={{width: 200, backgroundColor: 'white', }} */}
          {/*     variant="filled" */}
          {/*     > */}
          {/*     <InputLabel id="demo-simple-select-label">Active Teleoscope</InputLabel> */}
          {/*     <Select */}
          {/*       labelId="demo-simple-select-label" */}
          {/*       id="demo-simple-select" */}
          {/*       value={teleoscope_id} */}
          {/*       label="Teleoscope ID" */}
          {/*       onChange={(event) => dispatch(teleoscopeActivator(event.target.value))} */}
          {/*     > */}
          {/*       {getTeleoscopes()} */}
          {/*     </Select> */}
          {/*   </FormControl> */}
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
              <InputLabel id="demo-simple-select-label">Active Session</InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={session_id}
                label="Session ID"
                onChange={(event) => handleSessionChange(event)}
              >
                {getSessions(cookies.user)}
                <Button
               size="small"
               variant="text"
               onClick={() => initialize_session(client, cookies.user, randomName)}
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
          </Stack>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
