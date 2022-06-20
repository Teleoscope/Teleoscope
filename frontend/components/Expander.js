import React, { useState } from "react";


// MUI imports
import IconButton from "@mui/material/IconButton";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Collapse from "@material-ui/core/Collapse";
import List from "@mui/material/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Button from "@mui/material/Button";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
// actions


export default function Expander(props) {

   const [open, setOpen] = useState(false);
   const [viewMore, setViewMore] = useState(false);

   const handleClick = () => {
      if (!open) setViewMore(false);
      setOpen(!open);
   };

   const post = props.post;

   return (
      <div>
         <IconButton onClick={handleClick}>
            {open ? <ExpandLess /> : <ExpandMore />}
         </IconButton>

         <Collapse timeout="auto" unmountOnExit in={open}>
                  <ListItemText
                     primary={post ? post["selftext"] : "Post content not available"}
                     ellipsizeMode="tail"
                     style={{
                        marginLeft: 50,
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
      </div>
   )
}