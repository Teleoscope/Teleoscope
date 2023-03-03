import React from "react";

// MUI
import { Typography } from '@mui/material';
import { Flare } from '@mui/icons-material';
import { Stack } from '@mui/material';

export default function TeleoscopeLogo (props) {
    return (
      <Stack direction="row" alignItems="center">
        <Flare />
        <Typography
          variant="h5"
          sx={{
            fontWeight: 'fontWeightLight',
            fontFamily: "monospace",
          }}>
          Teleoscope{props.isConnected ? "" : ": Not connected to database."}
        </Typography>
      </Stack>
    )
  }