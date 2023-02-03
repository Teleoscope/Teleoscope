import React from "react";
import { TextField } from '@mui/material';
import { InputAdornment } from '@mui/material';
import { alpha } from "@mui/material";

import { AccountCircle } from '@mui/icons-material';



export default function Account(props) {
    return (
      <TextField
        id="input-with-icon-textfield"
        sx={{ width: "100%", backgroundColor: alpha('#FFFFFF', 0.0), }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <AccountCircle />
            </InputAdornment>
          ),
        }}
        label="Username"
        variant="standard"
        defaultValue={props.user?.username}
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            props.handleCookie((e.target as HTMLTextAreaElement).value)
          }
        }}
      />
    )
  }