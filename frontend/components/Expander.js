import React, { useState } from "react";

// MUI imports
import Collapse from '@mui/material/Collapse';
import Button from "@mui/material/Button";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

// custom components
import PostText from "./PostText"


export default function Expander(props) {

   const [viewMore, setViewMore] = useState(false);


   const post = props.post;
   console.log("post",post)

   return (
         <Collapse timeout="auto" unmountOnExit in={open}>
               <PostText post={post}></PostText>
               <Button
                  variant="text"
                  style={{ fontSize: 11, margin: "0 auto", display: "flex" }}
                  onClick={() => setViewMore(!viewMore)}
               >
                  {viewMore ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
               </Button>
         </Collapse>
      
   )
}