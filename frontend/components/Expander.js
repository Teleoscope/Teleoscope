import React, { useState } from "react";

// MUI imports
import Collapse from '@mui/material/Collapse';
import Button from "@mui/material/Button";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

// custom components
import DocumentText from "./DocumentText"


export default function Expander(props) {

   const [viewMore, setViewMore] = useState(false);


   const document = props.document;
   console.log("document", document)

   return (
      <Collapse timeout="auto" unmountOnExit in={open}>
         <DocumentText document={document}></DocumentText>
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