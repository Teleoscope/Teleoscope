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
import { searcher } from "../actions/searchterm";
import { addGroup } from "../actions/groups";
import { sessionActivator, loadActiveSessionID } from "../actions/activeSessionID";
import { addWindow} from "../actions/windows";
import { dragged } from "../actions/windows";

// utils
import { add_group } from "../components/Stomp.js";

// contexts
import { StompContext } from '../context/StompContext'

// custom components

export default function LeftMenuBarGroups() {
   const [groupedData, setGroupedData] = React.useState([]);
   const [grouped, setGrouped] = React.useState(false)
   
   const client = useContext(StompContext);
   const filter = createFilterOptions();
   const dispatch = useDispatch();
   const [value, setValue] = React.useState(null);
   
   const [open, toggleOpen] = React.useState(false);
   const [text, setText] = useState("");
   const { sessions, sessions_loading, sessions_error } = useSWRAbstract("sessions", `/api/sessions/`);
   const session_id = useSelector((state) => state.activeSessionID.value);
   const { session, session_loading, session_error } = useSWRAbstract("session", `/api/sessions/${session_id}`);
   const [colourIndex, setColourIndex] = useState(0);
   const { groups, groups_loading, groups_error } = useSWRAbstract("groups", `/api/sessions/${session_id}/groups`);
   const group_labels = groups ? groups.map((g) => {return g.history[0].label}) : []

   const colors = [
      "#17becf",
      "#bcbd22",
      "#7f7f7f",
      "#e377c2",
      "#8c564b",
      "#9467bd",
      "#d62728",
      "#2ca02c",
      "#ff7f0e",
      "#1f77b4"
   ];

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
         dispatch(searcher(text));
      }
   };

   const onChangeHandler = (event, newValue) => {
      console.log("newValue", newValue)
      // both newValue when being an added group and when being an existing group is of type string
      if (typeof newValue === 'object' && newValue !== null && !newValue.label.includes("Add")) {
         groupedData = groupDataMaker(newValue.label);
         setGrouped(true);
      } else {
         console.log("newValue else", newValue)
         setGrouped(false);
      } 

      if (typeof newValue === 'string') {
         console.log("newValue === string", newValue)
         // timeout to avoid instant validation of the dialog's form.
         // TODO: seems like a bit of a hack, what behaviour is being suppressed here?
         // is there another way to modify it?
         setTimeout(() => {
            if (group_labels.includes(newValue)) {
               var g = groups.find(g => g.label == newValue)
               var postids = g.history[g.history.length - 1]["included_posts"];
               postids.forEach((id)=> {
                  dispatch(addWindow({i: id, x: 0, y: 0, w: 3, h: 3, type: "Post"}));
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


   const setRandomColor = () => {
      var ret = colors[colourIndex]
      if (colourIndex + 1 < colors.length - 1) {
         setColourIndex(colourIndex + 1);
      } else {
         setColourIndex(0);
      }
      return ret;
   }
   // const setRandomColor = () => {
   //    const randomColor = Math.floor(Math.random() * 16777215).toString(16);
   //    return "#" + randomColor;
   // };

   return (
   	<div style={{overflow:"auto", height: "100%"}}>
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
                  label="Post groups..."
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
                     onClick={() => {
                        var colour = setRandomColor()
                        add_group(client, dialogValue.label, colour, session_id)
                     }}>Add</Button>
               </DialogActions>
            </form>
         </Dialog>

      </React.Fragment>
      <List>
      {group_labels.map((gl) => {
         	return (
         		<div 
         			draggable={true}
					onDragStart={(e, data) => {dispatch(dragged(gl + "_group"))}}
         		>
         		<ListItem>
					<ListItemIcon>
                    	<FolderIcon sx={{ color: groups.find((g) => g.label == gl)?.color }}/>
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