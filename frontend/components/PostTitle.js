import React, { useState } from "react";

// MUI imports
import ListItemText from "@mui/material/ListItemText";
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';

// fonts
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

//util
import postTitle from "../util/posttitle"

export default function PostTitle(props) {
   const title = postTitle(props.post.title);
   return (
      <Tooltip title={title} placement="top">
         <Typography
            variant="body1"
            color={props.color ? props.color : "black"}
            noWrap={props.noWrap}
         >
            {title}
         </Typography>
      </Tooltip>
   )
}