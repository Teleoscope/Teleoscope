// GroupPalette.js
import React, { useState, useContext } from "react";

// MUI 
import TextField from "@mui/material/TextField";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import FolderIcon from '@mui/icons-material/Folder';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Diversity2Icon from '@mui/icons-material/Diversity2';

// actions
import useSWRAbstract from "../util/swr"
import { useSelector, useDispatch } from "react-redux";
import { addWindow } from "../actions/windows";
import { dragged } from "../actions/windows";

// utils
import { add_group } from "../components/Stomp.ts";

// contexts
import { StompContext } from '../context/StompContext'
import randomColor from "randomcolor";
import { IconButton } from "@mui/material";
import { cluster_by_groups } from "./Stomp";

// custom components

export default function GroupPalette(props) {
   const client = useContext(StompContext);
   const filter = createFilterOptions();
   const dispatch = useDispatch();
   const [value, setValue] = React.useState(null);
   
   const [open, toggleOpen] = React.useState(false);
   const session_id = useSelector((state) => state.activeSessionID.value);

   const { groups } = useSWRAbstract("groups", `/api/sessions/${session_id}/groups`);
   const group_labels = groups ? groups.map((g) => { return g.history[0].label }) : []

   const handleClose = () => {
      setDialogValue({
         label: '',
         color: '',
      });
      toggleOpen(false);
   };

   const handleSubmit = (event) => {
      event.preventDefault();
      setValue({
         label: dialogValue.label,
         color: parseInt(dialogValue.color, 10),
      });
      handleClose();
   };

   const [dialogValue, setDialogValue] = React.useState({
      label: '',
      color: '',
   });

   const keyChange = (e) => {
      if (e.code == "Enter") {
      }
   };

   const onChangeHandler = (event, newValue) => {
      if (typeof newValue === 'string') {
         // timeout to avoid instant validation of the dialog's form.
         setTimeout(() => {
            if (group_labels.includes(newValue)) {
               var g = groups.find(g => g.label == newValue)
               var postids = g.history[0]["included_posts"];

               postids.forEach((id) => {
                  dispatch(addWindow({ i: id + "%post", x: 0, y: 0, w: 3, h: 3, type: "Post" }));
               })
            }

            toggleOpen(false);
            setDialogValue({
               label: newValue,
               color: '',
            });
         });
      } else if (newValue && newValue.inputValue) {
         console.log("newValue && newValue.inputValue", newValue)
         toggleOpen(true);
         setDialogValue({
            label: newValue.inputValue,
            color: '',
         });
      } else {
         console.log("newValue setValue", newValue)
         setValue(newValue);
      }
   };

   const filteredOptionsHandler = (options, params) => {
      const filtered = filter(options, params);

      if (params.inputValue !== '') {
         filtered.push({
            inputValue: params.inputValue,
            label: `Add "${params.inputValue}"`,
         });
      }

      return filtered;
   }

   const runClusters = () => {
      cluster_by_groups(client, groups.map(g => g._id), session_id)
   }

   const handleOnDragStart = (e, data, group) => {
      dispatch(dragged({ id: group?._id + "%group", type: "Group" }))
   }

   const GroupList = () => {
      return (
         <List>
               {group_labels.map((gl) => {
                  var group = groups.find(g => g.history[0].label == gl);

                  return (
                     <div draggable={true} onDragStart={(e, data) => handleOnDragStart(e, data, group)}>
                        <ListItem>
                           <ListItemIcon>
                              <FolderIcon sx={{ color: group?.history[0].color }} />
                           </ListItemIcon>
                           <ListItemText
                              primary={gl}
                              secondary={gl ? 'Description' : null}
                           />
                        </ListItem>
                     </div>
                  )
               })}
            </List>
      )
   }


   return (
      <div style={{ overflow: "auto", height: "100%" }}>
         <Stack direction="row" justifyContent="right" alignItems="center" style={{margin: 0}}>
            <IconButton onClick={() => runClusters()}><Diversity2Icon></Diversity2Icon></IconButton>
         </Stack>
         <Divider />
         <React.Fragment>
            <Autocomplete
               selectOnFocus
               clearOnBlur
               handleHomeEndKeys
               freeSolo
               id="Add Group"
               value={value}
               options={group_labels}
               sx={{ width: 300 }}
               style={{ width: "100%", borderRadius: "0 !important" }}
               onChange={(event, newValue) => {onChangeHandler(event, newValue)}}
               filterOptions={(options, params) => filteredOptionsHandler(options, params)}
               renderInput={(params) =>
                  <TextField {...params}
                     label="Search and Create groups..."
                     variant="filled"
                     placeholder="type to create, click to filter..."
                     onKeyDown={(e) => keyChange(e)}
                     style={{ width: "100%", borderRadius: "0 !important" }} />}
            />
            <Dialog open={open} onClose={handleClose}>
               <form onSubmit={handleSubmit}>
                  <DialogTitle>Add a new group</DialogTitle>
                  <DialogContent>
                     <DialogContentText>Input your group name and a random color will be matched to the group!</DialogContentText>
                     <TextField
                        autoFocus
                        variant="filled"
                        placeholder="Add group name"
                        margin="dense"
                        id="name"
                        label="group name"
                        type="text"
                        value={dialogValue.label}
                        style={{ width: "100%", borderRadius: "0 !important" }}
                        onChange={(event) => setDialogValue({...dialogValue, tag: event.target.value,})}
                     />
                  </DialogContent>
                  <DialogActions>
                     <Button onClick={handleClose}>Cancel</Button>
                     <Button type="submit"
                        onClick={() => add_group(client, dialogValue.label, randomColor(), session_id)}
                     >Add</Button>
                  </DialogActions>
               </form>
            </Dialog>
         </React.Fragment>
         <GroupList></GroupList>
      </div>
   )
}