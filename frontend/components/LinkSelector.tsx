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
import DocumentTitle from '../components/Documents/DocumentTitle';

// actions 
import { useAppSelector, useAppDispatch } from '../hooks'
import { addWindow } from "../actions/windows"
import { getDefaultWindow } from "./WindowFolder/WindowDefault"
import { PreprocessTitle } from "../../frontend/util/Preprocessers"

// contexts
import { Stomp } from './Stomp';

//utils
import useSWRAbstract from "../util/swr"

export default function linkSelector(props) {

   const userid = useAppSelector((state) => state.activeSessionID.userid);
   const client = Stomp.getInstance();
   client.userId = userid;
   const { document } = useSWRAbstract("document", `/api/document/${props.id}`);
   console.log("document", document)
   const links = document?.relationships;
   console.log("LINKS", links)
   const dispatch = useAppDispatch();
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
   const item = (id, type) => {
      const t = getDefaultWindow()
      t.i = id;
      t.type = type;
      console.log("default_item", t)
      return t;
    }
   const titleHandler = (props) => {   
   }
//TODO: for later if you want to be able to create relationships
   // const handleSelect = (document_id) => {
   //    console.log("FILTER"+ {links_this_document_belongs_to}); 
   //    console.log("LINKS" + {links})
   //    if (links_this_document_belongs_to) {
   //       //TODO: instead of this, want it to display information about the document
   //       client.create_child(document_id)
   //       // client.remove_document_from_group(group_id, props.id);
   //    } else {
   //       // client.add_document_to_group(group_id, props.id);
   //    }
   //    handleClose();
   // }
   
   const handleSelect = (meta_id) => {
      console.log("open parent document")
   }
   const LinkIconHandler = (props) => {
      if (props.links) {
         const l = props.links;
         return (
            <Tooltip title={l.type}>
               <FolderCopyIcon sx={{ color: l.color }} style={{ fontSize: 15 }} />
            </Tooltip>
         )
      }
      return (
         <Tooltip title="No link assigned...">
            <FolderOutlinedIcon sx={{ color: "#BBBBBB" }} style={{ fontSize: 15 }} />
         </Tooltip>
      )
   }

   return (
      <div>
         <IconButton onClick={handleClick}>
            <LinkIconHandler links = {links}/>  
         </IconButton> 
         <Menu
            anchorEl={anchorEl}
            onClose={handleClose}
            open={open}
         >
            {links ? links.map((link) => {
               return (
               <MenuItem
                  value = {link.type}
                   onClick= {() => { dispatch(addWindow({ i: link._id, type: "Document", ...item })) }}>
                  <FolderIcon style={{ fontSize: 15 }} />
                  <ListItemText primary={link.type} sx={{ color: '#6f42c1'}}/>
               </MenuItem>
               )
            })
               : <MenuItem>No links for this document...</MenuItem>}
         </Menu>
      </div>
   )
}