// Teleoscope.js
import React, { useState } from 'react';

// mui
import { styled, alpha } from '@mui/material/styles';
import InputBase from '@mui/material/InputBase';

import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Avatar from '@mui/material/Avatar';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import MoreIcon from '@mui/icons-material/MoreVert';
import LoadingButton from '@mui/lab/LoadingButton';

// actions
import { useSelector, useDispatch } from "react-redux";


// custom components
import PostList from "./PostList"
import CloseButton from "./CloseButton"

// util
import useSWRAbstract from "../util/swr"

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      width: '12ch',
      '&:focus': {
        width: '20ch',
      },
    },
  },
}));
export default function BottomAppBar() {
  const teleoscope_id = useSelector((state) => state.activeTeleoscopeID.value);

  const { teleoscope, teleoscope_loading, teleoscope_error } = useSWRAbstract("teleoscope", `/api/teleoscopes/${teleoscope_id}`);
  var data = [];
  if (teleoscope) {
    var history = teleoscope["history"];
    var history_item = history[history.length - 1];
    data = history_item["rank_slice"];
    console.log("teleoscope history",teleoscope, history, history_item, data)
  }


  return (  
      <div style={{overflow:"auto", height:"100%"}}>
        <Typography variant="h5" gutterBottom component="div" sx={{ p: 2, pb: 0 }}>
        Teleoscope {teleoscope_id}
        </Typography>
        {teleoscope_loading ? <LoadingButton loading={true}/> : <PostList data={data}></PostList>}
        
      <AppBar 
        className="drag-handle" 
        position="fixed" 
        color="primary" 
        sx={{ top: 'auto', bottom: 0 }}
      >
        <Toolbar>
          <CloseButton id="teleoscope" />
        </Toolbar>
      </AppBar>
      </div>
  );
}