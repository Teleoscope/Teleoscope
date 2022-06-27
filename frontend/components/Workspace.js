import React, { useEffect } from "react";

// mui
import Grid from '@mui/material/Grid';

// custom components
import TopBar from "../components/TopBar";
import LeftMenuBar from "../components/LeftMenuBar";
import RightMenuBar from "../components/RightMenuBar";
import WindowManager from "../components/WindowManager";

// actions
import { getGroups } from "../actions/groups"


import { useDispatch } from "react-redux";

export default function Workspace(props) {

  // call to intialize stores
  const dispatch = useDispatch()
  useEffect(() => {dispatch(getGroups())},[])
  
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


