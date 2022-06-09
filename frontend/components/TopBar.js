import React, { useState } from "react";
import useSWR, { mutate } from "swr";

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
import { teleoscopeActivator, loadActiveTeleoscopeID } from "../actions/activeTeleoscopeID";
import { sessionActivator, loadActiveSessionID } from "../actions/activeSessionID";
import { historyActivator, loadActiveHistoryItem } from "../actions/activeHistoryItem";
import { adder, loadAddedPosts } from "../actions/addtoworkspace";
import { searcher, loadSearchTerm } from "../actions/searchterm";
import { checker, uncheckall, loadCheckedPosts } from "../actions/checkedPosts";

// utilities
import {client_init, reorient, initialize_teleoscope, save_UI_state, save_teleoscope_state, load_teleoscope_state, initialize_session} from "../components/Stomp.js";
import randomstring from "randomstring";
import { useCookies } from "react-cookie";


const fetcher = (...args) => fetch(...args).then((res) => res.json());
function useTeleoscopes() {
  const { data, error } = useSWR(`/api/teleoscopes/`, fetcher);
  return {
    teleoscopes: data,
    loading: !error && !data,
    error: error,
  };
}

function useTeleoscope(id) {
  const { data, error } = useSWR(`/api/teleoscopes/${id}`, fetcher);
  return {
    teleoscope: data,
    teleoscope_loading: !error && !data,
    teleoscope_error: error,
  };
}

function useSessions() {
  const { data, error } = useSWR(`/api/sessions/`, fetcher);
  return {
    sessions: data,
    sessions_loading: !error && !data,
    sessions_error: error,
  };  
}


function useSession(id) {
  const { data, error } = useSWR(`/api/sessions/${id}`, fetcher);
  return {
    session: data,
    session_loading: !error && !data,
    session_error: error,
  };  
}

function useUsers() {
  const { data, error } = useSWR(`/api/users/`, fetcher);
  return {
    users: data,
    users_loading: !error && !data,
    users_error: error,
  };  
}

export default function TopBar(props) {

  const { teleoscopes, loading, error } = useTeleoscopes();
  const teleoscope_id = useSelector((state) => state.activeTeleoscopeID.value); // TODO rename
  const { teleoscope, teleoscope_loading, teleoscope_error } = useTeleoscope(teleoscope_id);


  console.log("teleoscope id is: ", teleoscope_id);

  const history_item_num = useSelector((state) => state.activeHistoryItem.value);

  const { sessions, sessions_loading, sessions_error } = useSessions();
  const { users, users_loading, users_error } = useUsers();
  
  const [cookies, setCookie] = useCookies(["user"]);
  const session_id = useSelector((state) => state.activeSessionID.value); // TODO rename

  const { session, session_loading, session_error } = useSession(session_id);
  
  const search_term = useSelector((state) => state.searchTerm.value); // TODO rename
  const added = useSelector((state) => state.adder.value); // TODO rename
  const checked = useSelector((state) => state.checkedPosts.value); // TODO rename

  const handleCookie = (username) => {
    setCookie("user", username, {
      path: "/"
    });
    console.log(`Set username to ${username}.`);
  }
  
  const dispatch = useDispatch();
  const client = client_init();




  const getTeleoscopes = () => {
    if (teleoscopes && session) {
      var ts = teleoscopes.filter((t) => {return session["teleoscopes"].indexOf(t["_id"]) > -1});
      return ts.map((t) => {
                  return (
                    <MenuItem value={t["_id"]}>{t["label"]}</MenuItem>
                )
      });
    }
    return (
            <MenuItem>No Teleoscopes started for this session...</MenuItem>
      )
  }
 
  const getSessions = (username) => {
      if (sessions && users) {
        for (const i in users) {
          var user = users[i];
          if (user["username"] == username) {
            return user["sessions"].map((s) => {
                return (<MenuItem value={s}>{s}</MenuItem>)
              })
          }
        }
      }
      return (
          <MenuItem value={"No sessions for this user..."}>No sessions for this user...</MenuItem>
      )    
  }


  const load_teleoscope_state = (history_item_num) => {
    var history_item = teleoscope["history"][history_item_num]
    dispatch(loadSearchTerm(history_item["search_term"]));
    dispatch(loadAddedPosts(history_item["added"]));
    dispatch(loadCheckedPosts(history_item["checked"]));
  }

  const reload = () => {
    var history_item = session["history"][session["history"].length - 1]
    dispatch(loadActiveTeleoscopeID(history_item["teleoscope_id"]));
    dispatch(loadSearchTerm(history_item["search_term"]));
    dispatch(loadAddedPosts(history_item["added"]));
    dispatch(loadCheckedPosts(history_item["checked"]));
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        style={{ height: 75, backgroundColor: "#4E5CBC" }}
      >
        <Toolbar sx={{}} >
          <Stack spacing={4} direction="row">
            <Button 
              variant="text" 
              onClick={() => initialize_session(client, cookies.user)}
              style={{
                backgroundColor: "#FFFFFF",
                color: "black",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              New session
            </Button>
            <Button 
              variant="text" 
              onClick={() => save_UI_state(
                client, 
                session_id, 
                { // history_item in save_UI_state in Stomp.js
                    "teleoscope_id": teleoscope_id,
                    "search_term": search_term,
                    "added": added,
                    "checked": checked
                })
              }
              style={{
                backgroundColor: "#FFFFFF",
                color: "black",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Save
            </Button>
            <Button 
              variant="text" 
              onClick={() => reload()}
              style={{
                backgroundColor: "#FFFFFF",
                color: "black",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Load
            </Button>
            <Button 
              variant="text" 
              onClick={() => initialize_teleoscope(client, search_term, session_id)}
              style={{
                backgroundColor: "#FFFFFF",
                color: "black",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              New Teleoscope
            </Button>
            <Button
              variant="text"
              onClick={() => save_teleoscope_state(
                client, 
                teleoscope_id,
                {
                  "search_term": search_term,
                  "added": added,
                  "checked": checked
                })}
                style={{
                backgroundColor: "#FFFFFF",
                color: "black",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Save Teleoscope
            </Button>
            <FormControl 
              sx={{width: 200, backgroundColor: 'white', }}
              variant="filled"
              >
              <InputLabel id="demo-simple-select-label">Load History Item</InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={history_item_num}
                label="History Item"
                onChange={(event) => dispatch(historyActivator(event.target.value))}
              >
                {!teleoscope_loading && !teleoscope_error ? teleoscope["history"].map((h, i) => {
                  return (
                    <MenuItem value={i}>{i}</MenuItem>
                )}):[]}
              </Select>
            </FormControl>
            <Button 
              variant="text" 
              onClick={() => load_teleoscope_state(history_item_num)}
              style={{
                backgroundColor: "#FFFFFF",
                color: "black",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Load
            </Button>
            <Button
              onClick={() => {
                reorient(client, search_term, teleoscope_id, checked, []);
                dispatch(uncheckall(teleoscope_id))
              }}
              style={{
                backgroundColor: "#FFFFFF",
                color: "black",
                fontSize: 12,
                fontWeight: 700,
              }}

            >
              <BiotechIcon />
              Reorient
            </Button>
            <FormControl 
              sx={{width: 200, backgroundColor: 'white', }}
              variant="filled"
              >
              <InputLabel id="demo-simple-select-label">Active Teleoscope</InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={teleoscope_id}
                label="Teleoscope ID"
                onChange={(event) => dispatch(teleoscopeActivator(event.target.value))}
              >
                {getTeleoscopes()}
              </Select>
            </FormControl>
                  <TextField
                    id="input-with-icon-textfield"
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
                onChange={(event) => dispatch(sessionActivator(event.target.value))}
              >
                {getSessions(cookies.user)}
              </Select>
            </FormControl>


          </Stack>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
