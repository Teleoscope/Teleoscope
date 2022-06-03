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
import { adder, loadAddedPosts } from "../actions/addtoworkspace";
import { searcher, loadSearchTerm } from "../actions/searchterm";
import { checker, uncheckall, loadCheckedPosts } from "../actions/checkedPosts";

// utilities
import {client_init, reorient, initialize_teleoscope, save_UI_state, initialize_session} from "../components/Stomp.js";
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
  const { sessions, sessions_loading, sessions_error } = useSessions();
  
  const { users, users_loading, users_error } = useUsers();
  // const { session, session_loading, session_error } = useSession(session_id);
  const [cookies, setCookie] = useCookies(["user"]);

  const teleoscope_id = useSelector((state) => state.activeTeleoscopeID.value); // TODO rename
  const search_term = useSelector((state) => state.searchTerm.value); // TODO rename
  const added = useSelector((state) => state.adder.value); // TODO rename
  const checked = useSelector((state) => state.checkedPosts.value); // TODO rename

  const handleCookie = (username) => {
    setCookie("user", username, {
      path: "/"
    });
    console.log(`Set username to ${username}.`);
  }
 
  const getSessions = (username) => {
    console.log("getSessions called")
    console.log(users)
      if (sessions && users) {
        for (const i in users) {
          var user = users[i];
          console.log(user["username"])
          if (user["username"] == username) {
            console.log(user["sessions"])
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

  const dispatch = useDispatch();
  const client = client_init();

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
              onClick={() => initialize_session(client)}
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
              onClick={() => initialize_teleoscope(client, search_term)}
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
                {teleoscopes ? teleoscopes.map((t) => {
                  return (
                    <MenuItem value={t["_id"]}>{t["label"]}</MenuItem>
                )}):[]}
              </Select>
            </FormControl>
                  <TextField
                    id="input-with-icon-textfield"
                    label="TextField"
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
                value={"No sessions for this user..."}
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
