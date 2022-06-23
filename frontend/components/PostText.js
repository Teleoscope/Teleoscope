
import React, { useState } from "react";

import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
export default function PostText(props) {
   const text = props.text;
   return (

      <Box style={{overflow: "auto"}}>
         <Typography variant="body2" sx={{margin:"1em"}}>
            {text}
         </Typography>
      </Box>
      
      )
}