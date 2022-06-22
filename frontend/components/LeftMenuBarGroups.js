import React, { useState } from "react";

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
import { useSelector, useDispatch } from "react-redux";
import { searcher } from "../actions/searchterm";
import { addGroup } from "../actions/groups";

// global variables
const filter = createFilterOptions();
let grouped_data = [];
let grouped = false;

export default function LeftMenuBarGroups() {

   const dispatch = useDispatch();
   const [value, setValue] = React.useState(null);
   const labels = useSelector((state) => state.grouper.groups);
   const [open, toggleOpen] = React.useState(false);
   const [text, setText] = useState("");

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

   const setRandomColor = () => {
      const randomColor = Math.floor(Math.random() * 16777215).toString(16);
      return "#" + randomColor;
    };

   return (
      <React.Fragment>
         <Autocomplete
            //value={value}
            //value="test"
            onChange={(event, newValue) => {
               onChangeHandler(event, newValue)
            }}
            filterOptions={(options, params) => {
               const filtered = filter(options, params);

               if (params.inputValue !== '') {
                  filtered.push({
                     inputValue: params.inputValue,
                     label: `Add "${params.inputValue}"`,
                  });
               }

               return filtered;
            }}
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
                        dispatch(addGroup({ label: dialogValue.label, color: setRandomColor() }))
                     }}>Add</Button>
               </DialogActions>
            </form>
         </Dialog>
      </React.Fragment>
   )
}