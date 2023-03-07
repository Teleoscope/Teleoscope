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
          underline="hover"
          sx={{
            fontWeight: 'fontWeightLight',
            fontFamily: "monospace",
            color: props.color,
            textDecorationColor: props.color,
            '&:hover' : {
              color: '#FFFFFF',
              textDecorationColor: "#FFFFFF"  
            }
          }}>
          Teleoscope{props.isConnected ? "" : ": Not connected to database."}
        </Link>
      </Stack>
    )
  }