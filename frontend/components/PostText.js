import React, { useState } from "react";

// mui
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// custom
import PostEditor from "../components/PostEditor"

export default function PostText(props) {
   const text = props.text ? props.text : "Content not available.";
   return (
      <Box>
         <PostEditor text={text}></PostEditor>
         {/* <Typography variant="body2" sx={{ margin: "1em" }}> */}
            {/* {text} */}
         {/* </Typography> */}
      </Box>
   )
}