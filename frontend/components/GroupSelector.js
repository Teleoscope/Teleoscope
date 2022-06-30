import React, { useState, useContext } from "react";

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

// contexts
import { StompContext } from '../context/StompContext';
import { add_post_to_group, remove_post_from_group} from '../components/Stomp';

//utils
import useSWRAbstract from "../util/swr"

export default function groupSelector(props) {

   const client = useContext(StompContext);

   const dispatch = useDispatch();

   const session_id = useSelector((state) => state.activeSessionID.value);
   const { groups, groups_loading, groups_error } = useSWRAbstract("groups", `/api/sessions/${session_id}/groups`);
   console.log("groups", groups, `/api/sessions/${session_id}/groups`);
   const group_labels = groups ? groups.map((g) => {return g.label}) : []

   const groups_this_post_belongs_to = groups ? groups.filter((g) => {
      return g.history[g.history.length - 1].included_posts.includes(props.id)
   }) : [];

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

    const handleSelect = (_id) => {
      console.log("The groups have ", groups);
      if (grouped_posts.find((item) => item.id == props.id)) {
         remove_post_from_group(client, _id, props.id);
      } else {
         add_post_to_group(client, _id, props.id);
      }
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
         {groups_this_post_belongs_to.map(({id, _id}) => {
            return (<CircleIcon sx={{ color: groups[_id] }} style={{ fontSize: 15 }} />)})}
         {groups_this_post_belongs_to.length == 0 ? 
                     <CircleIcon sx={{ color: "#BBBBBB" }} style={{ fontSize: 15 }} /> : ""}
         </IconButton>
         <Menu
            anchorEl={anchorEl}
            onClose={handleClose}
            open={open}
         >
            {groups ? Object.keys(groups).map(_id => (
               <MenuItem 
                  value={_id} 
                  onClick={() => handleSelect(_id)}>
                  <CircleIcon sx={{ color: groups[_id].color }} style={{ fontSize: 15 }} />
                  <ListItemText primary={groups[_id].label} />
               </MenuItem>
            )) : <MenuItem>No groups added yet...</MenuItem>}
         </Menu>
      </div>
   )
}