// Teleoscope.js
import React, { useState } from 'react';
import { useCookies } from "react-cookie";

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
import FlareIcon from '@mui/icons-material/Flare';

// actions
import { useSelector, useDispatch } from "react-redux";


// custom components
import PostList from "../PostList"
import CloseButton from "../CloseButton"
import { WindowHeader } from '../Window/WindowHeader';
import { WindowBody } from '../Window/WindowBody';

// util
import useSWRAbstract from "../../util/swr"

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


// abstracting for Window Header & Body
const TeleoscopeHeader = ({props}) => {
  const teleoscope_id = props.id.split("_")[0];
  const [cookies, setCookie] = useCookies(["user"]);
  const { user } = useSWRAbstract("user", `/api/users/${cookies.user}`);
  const session_id = useSelector((state) => state.activeSessionID.value);
  const { teleoscope, teleoscope_loading } = useSWRAbstract("teleoscope", `/api/teleoscopes/${teleoscope_id}`);
  const { teleoscopes_raw } = useSWRAbstract("teleoscopes_raw", `/api/sessions/${session_id}/teleoscopes`);
  const teleoscopes = teleoscopes_raw?.map((t) => {
    var ret = {
      _id: t._id,
      label: t.history[t.history.length - 1].label
    }
    return ret;
  });
  
  var data = [];
  if (teleoscope) {
    var history = teleoscope["history"];
    var history_item = history[history.length - 1];
    data = history_item["rank_slice"];
  }

  return (
    <div>
      <Typography variant="h5" gutterBottom component="div" sx={{ p: 2, pb: 0 }}>
        Teleoscope: {teleoscope?.history[teleoscope?.history.length - 1].label}
      </Typography>
    </div>
  )

}

const TeleoscopeBody = ({props}) => {
  const teleoscope_id = props.id.split("_")[0];
  const [cookies, setCookie] = useCookies(["user"]);
  const { user } = useSWRAbstract("user", `/api/users/${cookies.user}`);
  const { teleoscope, teleoscope_loading } = useSWRAbstract("teleoscope", `/api/teleoscopes/${teleoscope_id}`);

  var data = [];
  if (teleoscope) {
    var history = teleoscope["history"];
    var history_item = history[history.length - 1];
    data = history_item["rank_slice"];
  }

  return (
    <div>
      {teleoscope_loading ? <LoadingButton loading={true} /> : <PostList pagination={true} data={data}></PostList>}
    </div>
  )
}

export default function Teleoscope(props) {
  return (
    <>
      <WindowHeader>
        <TeleoscopeHeader props={props} />
      </WindowHeader>

      <WindowBody>
        <TeleoscopeBody props={props} />
      </WindowBody>
    </>
  );
}