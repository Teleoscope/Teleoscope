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
import { useAppSelector } from '../hooks'

// contexts
import { Stomp } from './Stomp';

//utils
import useSWRAbstract from "../util/swr"

export default function groupSelector(props) {

   const userid = useAppSelector((state) => state.activeSessionID.userid);
   const client = Stomp.getInstance();
   client.userId = userid;
   const session_id = useAppSelector((state) => state.activeSessionID.value);
   const { groups } = useSWRAbstract("groups", `/api/sessions/${session_id}/groups`);

   const groups_this_document_belongs_to = groups ? groups.filter((g) => {
      return g.history[0].included_documents.includes(props.id)
   }) : [];

   const [anchorEl, setAnchorEl] = useState(null);
   const open = Boolean(anchorEl);
   const handleClick = (event) => {
      setAnchorEl(event.currentTarget);
   };

   const handleClose = () => {
      setAnchorEl(null);
   };

   const handleSelect = (group_id) => {
      if (groups_this_document_belongs_to.find((item) => item.id == props.id)) {
         client.remove_document_from_group(group_id, props.id);
      } else {
         client.add_document_to_group(group_id, props.id);
      }
      handleClose();
   }

   const GroupIconHandler = (props) => {
      if (props.groups.length >= 1) {
         const g = props.groups[0].history[0];
         return (
            <Tooltip title={g.label}>
               <FolderCopyIcon sx={{ color: g.color }} style={{ fontSize: 15 }} />
            </Tooltip>
         )
      }
      return (
         <Tooltip title="No group assigned...">
            <FolderOutlinedIcon sx={{ color: "#BBBBBB" }} style={{ fontSize: 15 }} />
         </Tooltip>
      )
   }

   return (
      <div>
         <IconButton onClick={handleClick}>
            <GroupIconHandler groups={groups_this_document_belongs_to} />
         </IconButton>
         <Menu
            anchorEl={anchorEl}
            onClose={handleClose}
            open={open}
         >
            {groups ? groups.map((g) => {
               const _id = g._id

               return (

                  <MenuItem
                     value={_id}
                     onClick={() => handleSelect(_id)}>
                     <FolderIcon sx={{ color: g.history[0].color }} style={{ fontSize: 15 }} />
                     <ListItemText primary={g.history[0].label} />
                  </MenuItem>
               )
            }) : <MenuItem>No groups added yet...</MenuItem>}
         </Menu>
      </div>
   )
}