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
import useSWRAbstract from "../../util/swr"
import { useAppSelector, useAppDispatch } from '../../hooks'
import { RootState } from '../../stores/store'
import { addWindow } from "../../actions/windows";
import { dragged } from "../../actions/windows";

// contexts
import { Stomp } from '../Stomp'
import randomColor from "randomcolor";
import {Box, FormControl, FormHelperText, IconButton, InputLabel, MenuItem, Select} from "@mui/material";
import { useCookies } from "react-cookie";
import ConnectingAirportsIcon from "@mui/icons-material/ConnectingAirports";

// custom components

export default function GroupPalette(props) {
   const { sessions } = useSWRAbstract("sessions", `/api/sessions/`);
   const { users } = useSWRAbstract("users", `/api/users/`);
   const userid = useAppSelector((state) => state.activeSessionID.userid);
   const client = Stomp.getInstance();
   client.userId = userid;
   const filter = createFilterOptions();
   const dispatch = useAppDispatch();
   const [value, setValue] = React.useState(null);
   const [sessionValue, setSessionValue] = React.useState({label: ''});
   const [groupValue, setGroupValue] = React.useState({label: null});
   const [groupName, setGroupName] = React.useState({label: null});

   const [cookies, setCookie] = useCookies(["user"]);
   const [open, toggleOpen] = React.useState(false);
   const session_id = useAppSelector((state) => state.activeSessionID.value);

   const { groups } = useSWRAbstract("groups", `/api/sessions/${session_id}/groups`);
   const group_labels = groups ? groups.map((g) => { return g.history[0].label }) : []

   const keyChange = (e) => {
      if (e.code == "Enter") {
         client.add_group(e.target.value, randomColor(), session_id)
      }
   };

   const handleClickOpen = () => {
      toggleOpen(true);
   };

   const handleClose = () => {
      setSessionValue({label: ''});
      setGroupValue({label: null});
      setGroupName({label: null});
      toggleOpen(false);
   };

   const defaultGroupName = () => {
       if (groupName.label) {return `${groupName.label}`}
       else if (groupValue.label) {
           groupName.label = `${groupValue.label.history[0].label} copy`
           return groupName.label
       }
       else {return null}
    }

   const getSessions = (username) => {
      if (sessions && users) {
         for (const i in users) {
            let user = users[i];
            if (user["username"] == username && user["sessions"].length > 0) {
               return user["sessions"].map((s) => {
                  var temp = sessions.find(ss => ss._id == s)
                  return (<MenuItem value={s}>{temp?.history[0].label}</MenuItem>)
               })
            }
         }
      }
      return (
          <MenuItem value={"No sessions for this user..."}>No sessions for this user...</MenuItem>
      )
   }

   const getGroups = (selectedSession) => {

      let obj = sessions.find(ss => ss._id == selectedSession)

      if (obj) {
         let groups = obj.history[0].groups
         let grps = useSWRAbstract("groups", `/api/sessions/${selectedSession}/groups`)

         if (groups.length == 0) {
            return <MenuItem value={"This session has no groups..."}>This session has no groups...</MenuItem>
         }

         else {
            return grps.groups.map((g) => {
               return (<MenuItem value={g}>{g?.history[0].label}</MenuItem>)
            })
         }
      }
      return (
          <MenuItem value={"No session selected..."}>No session selected...</MenuItem>
      )
   }

   const CopyGroup = () => {
      return (
          <Dialog open={open} onClose={handleClose}>
             <DialogTitle>Copy Group</DialogTitle>
             <DialogContent>
                <Box component="form" sx={{ display: 'flex', flexWrap: 'wrap' }}>

                    {/* maybe start using autocomplete combo boxes?*/}
                   <FormControl
                       sx={{ width: 200, backgroundColor: 'white', }}
                       variant="filled"
                   >
                      <InputLabel id="demo-simple-select-helper-label">Select Session</InputLabel>
                      <Select
                          labelId="demo-simple-select-helper-label"
                          id="demo-simple-select-helper"
                          value={sessionValue.label}
                          label="Session"
                          size="small"
                          onChange={(event) =>
                              setSessionValue({
                                 label: event.target.value,
                              })
                          }
                      >
                         {getSessions(cookies.user)}
                      </Select>
                   </FormControl>




                   <FormControl
                       sx={{ width: 200, backgroundColor: 'white', }}
                       variant="filled"
                   >
                      <InputLabel id="demo-simple-select-helper-label">Select Group</InputLabel>

                      {/* maybe start using autocomplete combo boxes?*/}
                      <Select
                          labelId="demo-simple-select-helper-label"
                          id="demo-simple-select-helper"
                          value={groupValue.label}
                          label="Group"
                          size="small"
                          onChange={(event) =>
                              setGroupValue({label: event.target.value})
                          }
                      >
                         {getGroups(sessionValue.label)}
                      </Select>
                   </FormControl>



                    <FormControl
                           sx={{ width: 200, backgroundColor: 'white', }}
                           variant="filled"
                       >
                      <TextField
                          id="standard-helperText"
                          label="Group Name"
                          defaultValue={defaultGroupName()}
                          helperText="name the group you are copying..."
                          variant="standard"
                          onChange={(event) =>
                              setGroupName({
                                 label: event.target.value,
                              })
                          }
                      />
                   </FormControl>

                </Box>
             </DialogContent>
             <DialogActions>
                <Button
                    type="submit"
                    onClick={() => {
                        console.log('sv', sessionValue.label)
                        console.log('gv', groupValue.label._id)
                        console.log('gn', groupName.label)

                       // client.copy_group(sessionValue.label, groupValue.label._id, groupName.label)
                       handleClose()
                    }}
                >Add
                </Button>
             </DialogActions>
          </Dialog>
      )
   }

   const runClusters = () => {
      client.cluster_by_groups(groups.map(g => g._id), session_id)
   }

   return (
      <div style={{ overflow: "auto", height: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" style={{ margin: 0 }}>
      <TextField 
         label="Create new group..."
         placeholder="Type label and press enter."
         variant="standard"
         onKeyDown={(e) => keyChange(e)}
         onChange={(e) => setValue(e.target.value)}
         InputLabelProps={{
            style: { color:  props.color },
          }}
         sx={{ 
            width: "75%", 
            margin: 1,
            '& .MuiInput-underline:before': { borderBottomColor: props.color },
            '& .MuiInput-underline:after': { borderBottomColor: props.color },
            '& .MuiInputLabel-root': { borderBottomColor: props.color }, 
         }}
      />

      <IconButton onClick={() => runClusters()}><Diversity2Icon sx={{color: props.color}}/></IconButton>
         <IconButton onClick={handleClickOpen}><ConnectingAirportsIcon sx={{color: props.color}}/></IconButton>
         <CopyGroup />

      </Stack>
      <Divider />
      
            
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