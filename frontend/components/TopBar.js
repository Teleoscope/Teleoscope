import React, { useState } from "react";

// material ui
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import BiotechIcon from "@mui/icons-material/Biotech";

export default function TopBar(props) {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        style={{ height: 50, backgroundColor: "#4E5CBC" }}
      >
        <Toolbar>
          <Button
            style={{
              backgroundColor: "#FFFFFF",
              color: "black",
              margin: "auto",
              marginTop: 0,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <BiotechIcon />
            Analyze
          </Button>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
