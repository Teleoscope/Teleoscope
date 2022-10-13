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
      console.log("newValue", newValue)

      if (typeof newValue === 'string') {
         console.log("newValue === string", newValue)
         // timeout to avoid instant validation of the dialog's form.
         // TODO: seems like a bit of a hack, what behaviour is being suppressed here?
         // is there another way to modify it?
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

   return (
      <div
         style={{ overflow: "auto", height: "100%" }}

      >
         <React.Fragment>
            <Autocomplete
               value={value}
               onChange={(event, newValue) => {
                  onChangeHandler(event, newValue)
               }}
               // creates the add button when the input doesn't match any of the existing groups
               filterOptions={(options, params) => filteredOptionsHandler(options, params)}
               id="Add Group"
               options={group_labels}
               style={{ width: "100%", borderRadius: "0 !important" }}
               selectOnFocus
               clearOnBlur
               handleHomeEndKeys
               //renderOption={(props, option) => <li {...props}>{option}</li>}
               sx={{ width: 300 }}
               freeSolo
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
                     <DialogContentText>
                        Input your group name and a random color will be matched to the group!
                     </DialogContentText>
                     <TextField
                        variant="filled"
                        placeholder="Add group name"
                        style={{ width: "100%", borderRadius: "0 !important" }}
                        autoFocus
                        margin="dense"
                        id="name"
                        value={dialogValue.label}
                        onChange={(event) =>
                           setDialogValue({
                              ...dialogValue,
                              tag: event.target.value,
                           })
                        }
                        label="group name"
                        type="text"
                     />
                  </DialogContent>
                  <DialogActions>
                     <Button onClick={handleClose}>Cancel</Button>
                     <Button
                        type="submit"
                        onClick={() => add_group(client, dialogValue.label, randomColor(), session_id)
                        }>Add</Button>
                  </DialogActions>
               </form>
            </Dialog>

         </React.Fragment>
         <List>
            {group_labels.map((gl) => {
               var the_group = groups.find(g => g.history[0].label == gl);

               return (
                  <div
                     draggable={true}
                     onDragStart={(e, data) => { dispatch(dragged({ id: the_group?._id + "%group", type: "Group" })) }}
                  >
                     <ListItem>
                        <ListItemIcon>
                           <FolderIcon sx={{ color: the_group?.history[0].color }} />
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
      </div>
   )
}