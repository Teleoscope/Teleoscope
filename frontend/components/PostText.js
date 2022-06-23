
import React, { useState } from "react";

import Typography from '@mui/material/Typography';

export default function PostText(props) {
   const text = props.text;
   return (
      <Typography sx={{margin:"1em"}}>
         {text}
      </Typography>
      )
}