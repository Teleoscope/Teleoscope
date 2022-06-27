import React, { useState, useContext } from "react";

// MUI 
import TextField from "@material-ui/core/TextField";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';

// actions
import useSWRAbstract from "../util/swr"
import { useSelector, useDispatch } from "react-redux";
import { searcher } from "../actions/searchterm";
import { addGroup } from "../actions/groups";
import { sessionActivator, loadActiveSessionID } from "../actions/activeSessionID";

// contexts
import { StompContext } from '../context/StompContext'

// global variables
const filter = createFilterOptions();
let grouped_data = [];
let grouped = false;

export default function LeftMenuBarGroups() {

   const client = useContext(StompContext);

   const dispatch = useDispatch();
   const [value, setValue] = React.useState(null);
   const labels = useSelector((state) => state.grouper.groups);
   const [open, toggleOpen] = React.useState(false);
   const [text, setText] = useState("");
   const { sessions, sessions_loading, sessions_error } = useSWRAbstract("sessions", `/api/sessions/`);
   const session_id = useSelector((state) => state.activeSessionID.value);
   const { session, session_loading, session_error } = useSWRAbstract("session", `/api/sessions/${session_id}`);

   const i = -1;
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

      // both newValue when being an added group and when being an existing group is of type string
      if (typeof newValue === 'object' && newValue !== null && !newValue.label.includes("Add")) {
         grouped_data = groupDataMaker(newValue.label);
         grouped = true;
      } else {
         grouped = false;
      } if (typeof newValue === 'string') {
         // timeout to avoid instant validation of the dialog's form.
         // TODO: seems like a bit of a hack, what behaviour is being suppressed here?
         // is there another way to modify it?
         setTimeout(() => {
            toggleOpen(true);
            setDialogValue({
               label: newValue,
               color: '',
            });
         });
      } else if (newValue && newValue.inputValue) {
         toggleOpen(true);
         setDialogValue({
            label: newValue.inputValue,
            color: '',
         });
      } else {
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
      if (!i > colors.length) {
         i++
         return colors[i];
      } else { i = -1; }
      // or we can call the randomColorSelector
   }
   // const setRandomColor = () => {
   //    const randomColor = Math.floor(Math.random() * 16777215).toString(16);
   //    return "#" + randomColor;
   // };

   return (
      <React.Fragment>
         <Autocomplete
            value={value}
            onChange={(event, newValue) => {
               console.log(newValue)
               onChangeHandler(event, newValue)
            }}

            // creates the add button when the input doesn't match any of the existing groups
            filterOptions={(options, params) => filteredOptionsHandler(options, params)}
            id="Add Group"
            options={Object.keys(labels)}
            // getOptionLabel={(option) => {
            //    // e.g value selected with enter, right from the input
            //    if (typeof option === 'string') {
            //       return option;
            //    }
            //    if (option.inputValue) {
            //       // if the user is typing then populate the text field with what they are typing 
            //       return option.inputValue;
            //    }
            //    return option.label;
            // }}
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
                        dispatch(addGroup({ client: client, label: dialogValue.label, color: setRandomColor(), session_id: session_id }))
                     }}>Add</Button>
               </DialogActions>
            </form>
         </Dialog>
      </React.Fragment>
   )
}