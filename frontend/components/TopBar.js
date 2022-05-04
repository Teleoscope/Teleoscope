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


// actions
import { useSelector, useDispatch } from "react-redux";
import { activator, loadActiveTeleoscopeID } from "../actions/activeTeleoscopeID";
import { adder, loadAddedPosts } from "../actions/addtoworkspace";
import { searcher, loadSearchTerm } from "../actions/searchterm";
import { checker, uncheckall, loadCheckedPosts } from "../actions/checkedPosts";

// utilities
import {client_init, reorient, initialize_teleoscope, save_UI_state, initialize_session} from "../components/Stomp.js";
import randomstring from "randomstring";

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

export default function TopBar(props) {
  const { teleoscopes, loading, error } = useTeleoscopes();
  const { sessions, sessions_loading, sessions_error } = useSessions();
  const session_id = sessions_error || sessions_loading ? -1 : sessions[sessions.length - 1]['session_id']
  const { session, session_loading, session_error } = useSession(session_id);
  
  const teleoscope_id = useSelector((state) => state.activeTeleoscopeID.value); // TODO rename
  const search_term = useSelector((state) => state.searchTerm.value); // TODO rename
  const added = useSelector((state) => state.adder.value); // TODO rename
  const checked = useSelector((state) => state.checkedPosts.value); // TODO rename
  
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
                {
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
              onClick={() => initialize_teleoscope(client, search_term, teleoscope_id, added, [])}
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
                onChange={(event) => dispatch(activator(event.target.value))}
              >
                {teleoscopes ? teleoscopes.map((t) => {
                  return (
                    <MenuItem value={t["teleoscope_id"]}>{t["query"]}</MenuItem>
                )}):[]}
              </Select>
            </FormControl>
          </Stack>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
