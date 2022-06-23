import React, { useState } from "react";

// Mui imports
import { FormControl } from "@material-ui/core";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import InputLabel from '@mui/material/InputLabel';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Select from '@mui/material/Select';
import OutlinedInput from '@mui/material/OutlinedInput';
import CircleIcon from '@mui/icons-material/Circle';


// actions 
import { useSelector, useDispatch } from "react-redux";
import { group, addGroup } from "../actions/groups";


export default function groupSelector(props) {

   const dispatch = useDispatch();
   const grouped_posts = useSelector((state) => state.grouper.grouped_posts);
   const groups_this_post_belongs_to = grouped_posts.filter(e => e.id == props.id)
   const groups = useSelector((state) => state.grouper.groups);

   const [menuItem, setMenuItem] = React.useState([]);

   const ITEM_HEIGHT = 48;
   const ITEM_PADDING_TOP = 8;

   const [anchorEl, setAnchorEl] = useState(null);
   const open = Boolean(anchorEl);
   const handleClick = (event) => {
     setAnchorEl(event.currentTarget);
   };

   const handleClose = () => {
      setAnchorEl(null);
   };

   const handleChange = (event) => {
      const {
        target: { value },
      } = event;
      setMenuItem(
        // On autofill we get a stringified value.
        typeof value === 'string' ? value.split(',') : value,
      );
    };

    const handleSelect = (label) => {
      dispatch(group({ id: props.id, label: label }));
      handleClose();
    }

   const MenuProps = {
      PaperProps: {
         style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
         },
      },
   };


   return (
      <div>
         <IconButton onClick={handleClick}>
         {groups_this_post_belongs_to.map(({id, label}) => {
            return (<CircleIcon sx={{ color: groups[label] }} style={{ fontSize: 15 }} />)})}
         {groups_this_post_belongs_to.length == 0 ? 
                     <CircleIcon sx={{ color: "#BBBBBB" }} style={{ fontSize: 15 }} /> : ""}
         </IconButton>
         <Menu
            anchorEl={anchorEl}
            onClose={handleClose}
            open={open}
         >
            {Object.keys(groups).map(label => (
               <MenuItem 
                  value={label} 
                  onClick={() => handleSelect(label)}>
                  <CircleIcon sx={{ color: groups[label] }} style={{ fontSize: 15 }} />
                  <ListItemText primary={label} />
               </MenuItem>
            ))}
            {Object.keys(groups).length == 0 ? <MenuItem>No groups added yet...</MenuItem> : ""}
         </Menu>
      </div>
   )
}