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
import { IconButton } from "@mui/material";
import { useCookies } from "react-cookie";

// custom components

export default function GroupPalette(props) {
   const userid = useAppSelector((state) => state.activeSessionID.value);
   const client = Stomp.getInstance();
   client.userId = userid;
   const filter = createFilterOptions();
   const dispatch = useAppDispatch();
   const [value, setValue] = React.useState(null);
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