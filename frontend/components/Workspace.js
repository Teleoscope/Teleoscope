import React from "react";
import useSWR, { mutate } from "swr";

import Button from "@mui/material/Button";

// dropdown TODO: move this
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import Grid from '@mui/material/Grid';

// custom components
import TopBar from "../components/TopBar";
import LeftMenuBar from "../components/LeftMenuBar";
import RightMenuBar from "../components/RightMenuBar";
import WindowManager from "../components/WindowManager";

// utilities
import {client_init, reorient, initialize_teleoscope} from "../components/Stomp.js";
import randomstring from "randomstring";

// actions
import { useSelector, useDispatch } from "react-redux";
import { adder } from "../actions/addtoworkspace";
import { activator } from "../actions/activeTeleoscopeID";
import { searcher } from "../actions/searchterm";


export default function Workspace(props) {
  const added = useSelector((state) => state.adder.value); // TODO rename
  const search_term = useSelector((state) => state.searchTerm.value); // TODO rename
  const teleoscope_id = useSelector((state) => state.activeTeleoscopeID.value); // TODO rename
  const dispatch = useDispatch();

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TopBar/>
      </Grid>
      <Grid item xs={2}>
        <LeftMenuBar />
      </Grid>
      <Grid item xs={8}>
        <WindowManager />
      </Grid>
      <Grid item xs={2}>
        <RightMenuBar/>
      </Grid>
    </Grid>
  );
}


