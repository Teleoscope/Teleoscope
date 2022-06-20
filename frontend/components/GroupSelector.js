import React, { useState } from "react";

// Mui imports
import { FormControl } from "@material-ui/core";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import OutlinedInput from '@mui/material/OutlinedInput';
import CircleIcon from '@mui/icons-material/Circle';


// actions 
import { useSelector, useDispatch } from "react-redux";
import { group, addGroup } from "../actions/groups";


export default function groupSelector(props) {

   const dispatch = useDispatch();
   const grouped = useSelector((state) => state.grouper.value);
   const groupLabel = useSelector((state) => state.grouper.groups);
   const [menuItem, setMenuItem] = React.useState([]);
   const postID = props.id;
   const ITEM_HEIGHT = 48;
   const ITEM_PADDING_TOP = 8;

   const handleChange = (event) => {
      const {
        target: { value },
      } = event;
      setMenuItem(
        // On autofill we get a stringified value.
        typeof value === 'string' ? value.split(',') : value,
      );
    };

   const MenuProps = {
      PaperProps: {
         style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
         },
      },
   };

   // gets the label for the post depending on its postID
   const getLabel = (id) => {
      let menuItems = [];
      grouped.forEach(element => {
        element.id === id ? menuItems.push(element.label) : null;
      })
      return menuItems;
    };

   return (
      <FormControl sx={{ m: 1, width: 300 }}>
         <InputLabel id="demo-simple-select-label">Group</InputLabel>
         <Select
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            multiple
            value={getLabel(props.id)}
            onChange={handleChange}
            input={<OutlinedInput label="Group" />}
            MenuProps={MenuProps}
         >
            {groupLabel.map(labels => (
               <MenuItem value={labels.label} onClick={() => dispatch(group({ id: props.id, label: labels.label }))}>
                  <ListItemIcon>
                     <CircleIcon sx={{ color: labels.color }} style={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary={labels.label} />
               </MenuItem>
            ))}
            <MenuItem>Add Group</MenuItem>
         </Select>
      </FormControl>
   )
}