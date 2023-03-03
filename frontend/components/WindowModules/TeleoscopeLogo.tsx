import React from "react";

// MUI
import { Link, Typography } from '@mui/material';
import { Flare } from '@mui/icons-material';
import { Stack } from '@mui/material';

export default function TeleoscopeLogo (props) {
    return (
      <Stack direction="row" alignItems="center">
        <Flare />
        <Link
          href="http://github.com/Teleoscope/Teleoscope"
          variant="h5"
          sx={{
            fontWeight: 'fontWeightLight',
            fontFamily: "monospace",
          }}>
          Teleoscope{props.isConnected ? "" : ": Not connected to database."}
        </Link>
      </Stack>
    )
  }