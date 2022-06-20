import React, { useState } from "react";


// MUI imports

import Collapse from "@material-ui/core/Collapse";
import List from "@mui/material/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Button from "@mui/material/Button";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
// actions


export default function Expander(props) {

   const [viewMore, setViewMore] = useState(false);


   const post = props.post;

   return (
         <Collapse timeout="auto" unmountOnExit in={open}>
                  <ListItemText
                     primary={post ? post["selftext"] : "Post content not available"}
                     ellipsizeMode="tail"
                     style={{
                        marginLeft: 20,
                        display: "inline-block",
                        whiteSpace: "pre-line",
                     }}
                  />

               <Button
                  variant="text"
                  style={{ fontSize: 11, margin: "0 auto", display: "flex" }}
                  onClick={() => setViewMore(!viewMore)}
               >
                  {viewMore ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                  <div style={{ textDecoration: "underline" }}>
                     {viewMore ? "View Less" : "View More"}
                  </div>
               </Button>
         </Collapse>
      
   )
}