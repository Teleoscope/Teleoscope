import React, { useState } from "react";

// material ui
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";

export default function TopBar(props) {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        style={{ height: 50, backgroundColor: "#4E5CBC" }}
      >
        <Toolbar>
          <Button color="inherit">Analyze</Button>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
