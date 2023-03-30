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

// actions 
import { useAppSelector, useAppDispatch } from '../hooks'
import { addWindow } from "../actions/windows"
import { getDefaultWindow } from "./WindowFolder/WindowDefault"

// contexts
import { Stomp } from './Stomp';

//utils
import useSWRAbstract from "../util/swr"

export default function linkSelector(props) {
   
   const { document } = useSWRAbstract("document", `/api/document/${props.id}`);
   const links = document?.relationships;
   const dispatch = useAppDispatch();
   
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
      return t;
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
                   onClick= {() => { dispatch(addWindow({ i: link._id + '%document', type: "Document", ...item })) }}>
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