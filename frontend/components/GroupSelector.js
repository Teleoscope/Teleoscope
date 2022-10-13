import React, { useState, useContext } from "react";

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
import { useSelector } from "react-redux";

// contexts
import { StompContext } from '../context/StompContext';
import { add_post_to_group, remove_post_from_group } from '../components/Stomp.ts';

//utils
import useSWRAbstract from "../util/swr"

export default function groupSelector(props) {

   const client = useContext(StompContext);
   const session_id = useSelector((state) => state.activeSessionID.value);
   const { groups } = useSWRAbstract("groups", `/api/sessions/${session_id}/groups`);

   const groups_this_post_belongs_to = groups ? groups.filter((g) => {
      return g.history[0].included_posts.includes(props.id)
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
      if (groups_this_post_belongs_to.find((item) => item.id == props.id)) {
         remove_post_from_group(client, group_id, props.id);
      } else {
         add_post_to_group(client, group_id, props.id);
      }
      handleClose();
   }

   const GroupIconHandler = (props) => {
      if (props.groups.length == 0) {
         return (
            <FolderOutlinedIcon
               sx={{ color: "#BBBBBB" }}
               style={{ fontSize: 15 }} />
         )
      }
      if (props.groups.length == 1) {
         var g = props.groups[0];
         return (
            <Tooltip title={g.label} placement="top">
               <FolderIcon sx={{ color: g.color }} style={{ fontSize: 15 }} />
            </Tooltip>
         )
      }
      if (props.groups.length > 1) {
         var g = props.groups[0];
         return (
            <Tooltip title={g.label} placement="top">
               <FolderCopyIcon sx={{ color: g.color }} style={{ fontSize: 15 }} />
            </Tooltip>
         )
      }
   }

   return (
      <div>
         <IconButton onClick={handleClick}>
            <GroupIconHandler groups={groups_this_post_belongs_to} />

         </IconButton>
         <Menu
            anchorEl={anchorEl}
            onClose={handleClose}
            open={open}
         >
            {groups ? groups.map((g) => {
               var _id = g._id

               return (

                  <MenuItem
                     value={_id}
                     onClick={() => handleSelect(_id)}>
                     <FolderIcon sx={{ color: g.color }} style={{ fontSize: 15 }} />
                     <ListItemText primary={g.label} />
                  </MenuItem>
               )
            }) : <MenuItem>No groups added yet...</MenuItem>}
         </Menu>
      </div>
   )
}