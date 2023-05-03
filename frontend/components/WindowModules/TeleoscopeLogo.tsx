import React, { useContext } from "react";

// MUI
import { Link, Typography } from '@mui/material';
import { Flare } from '@mui/icons-material';
import { Stack } from '@mui/material';

export default function TeleoscopeLogo (props) {
    return (
      <Stack direction={props.compact ? "column" : "row"} alignItems="center">
        <Flare sx={
          {
            color: props.color,
            marginRight: "0.33em"
          }
        } />
        <Link
          href="http://github.com/Teleoscope/Teleoscope"
          underline="hover"
          sx={{
            fontWeight: 'fontWeightLight',
            fontFamily: "monospace",
            color: props.color,
            textDecorationColor: props.color,
            '&:hover' : {
              color: props.hoverColor ?  props.hoverColor : 'blue',
              textDecorationColor: props.textDecorationColor ? props.textDecorationColor : "blue"  
            }
          }}>
          {props.compact ? "" : "Teleoscope"}
        </Link>
      </Stack>
    )
  }