import React from "react";

// mui
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

export default function DocumentText(props) {
   const text = props.text ? props.text : "Content not available.";
   return (
      <Box>
         <Typography variant="body2" sx={{ margin: "1em" }}>
            {text}
         </Typography>
      </Box>
   )
}