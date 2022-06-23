import React from "react";

// mui
import Grid from '@mui/material/Grid';

// custom components
import TopBar from "../components/TopBar";
import LeftMenuBar from "../components/LeftMenuBar";
import RightMenuBar from "../components/RightMenuBar";
import WindowManager from "../components/WindowManager";

export default function Workspace(props) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TopBar/>
      </Grid>
      <Grid item xs={6}>
        <LeftMenuBar />
      </Grid>
      <Grid item xs={3}>
        <WindowManager />
      </Grid>
      <Grid item xs={3}>
        <RightMenuBar/>
      </Grid>
    </Grid>
  );
}


