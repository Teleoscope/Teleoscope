import React, { useState } from "react";

// Mui imports
import ListItemText from "@mui/material/ListItemText";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import FolderIcon from '@mui/icons-material/Folder';
import Tooltip from '@mui/material/Tooltip';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
import Accordion from '@mui/material/Accordion'
import { AccordionSummary } from "@mui/material";

// actions 
import { useAppSelector } from '../hooks'

// contexts
import { Stomp } from './Stomp';

//utils
import useSWRAbstract from "../util/swr"

export default function linkSelector(props) {

   const userid = useAppSelector((state) => state.activeSessionID.userid);
   const client = Stomp.getInstance();
   client.userId = userid;
   //TODO: change groups variable -> need to figure what this means
   // Look for examples in the document components -> want to grab document, so document_id
   // const { groups } = useSWRAbstract("groups", `/api/sessions/${session_id}/groups`);
   const { links } = useSWRAbstract("document", `/api/document/${props.id}`);
   //TODO: do I change this to include something with metadata?
   // Not filtering it as of now - check it out to understand
   const links_this_document_belongs_to = links ? links.map((l) => {
      return l['metadata']
      // return g.history[0].included_documents.includes(props.id)
   }) : [];
   //TODO: display key and value for the metadata -> display everything (see how that works)
   // have links to -> so from the relationships dict it finds the document and just shows that
   const [anchorEl, setAnchorEl] = useState(null);
   const open = Boolean(anchorEl);
   const handleClick = (event) => {
      setAnchorEl(event.currentTarget);
   };

   const handleClose = () => {
      setAnchorEl(null);
   };

   const handleSelect = (document_id) => {
      console.log("FILTER"+ {links_this_document_belongs_to}); 
      console.log("LINKS" + {links})
      if (links_this_document_belongs_to) {
         //TODO: instead of this, want it to display information about the document
         client.create_child(document_id)
         // client.remove_document_from_group(group_id, props.id);
      } else {
         // client.add_document_to_group(group_id, props.id);
      }
      handleClose();
   }

   const LinkIconHandler = (props) => {
      {links ? links.map((l) => {
         return (
            <AccordionSummary>
               value={l._id}
             </AccordionSummary>
         )
      }) :
       <AccordionSummary>No links for the document...</AccordionSummary>}

   }

   return (
      <div>
         <Accordion>
         <IconButton onClick={handleClick}>
            <LinkIconHandler />  
         </IconButton> 
         </Accordion>
      </div>
   )
}