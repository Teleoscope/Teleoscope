import React, { useContext } from "react";

// MUI imports
import Typography from '@mui/material/Typography';

// fonts
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

export default function DocumentTitle(props) {
   return (
         
         <Typography
            variant={props.size == "small" ? "caption" : "subtitle"}
            color={props.color ? props.color : "black"}
            noWrap={props.noWrap}
         >
            {props.title}
         </Typography>

   )
}