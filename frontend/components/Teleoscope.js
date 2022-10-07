// Teleoscope.js
import React, { useState } from 'react';
import { useCookies } from "react-cookie";

// mui
import { styled, alpha } from '@mui/material/styles';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import LoadingButton from '@mui/lab/LoadingButton';

// actions
import { useSelector } from "react-redux";

// custom components
import PostList from "./PostList"

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
export default function Teleoscope(props) {
  const [teleoscope_id, setTeleoscope_id] = useState(props.id.split("_")[0]);
  const [cookies, setCookie] = useCookies(["user"]);
  const { user } = useSWRAbstract("user", `/api/users/${cookies.user}`);
  const session_id = useSelector((state) => state.activeSessionID.value);
  const { teleoscope, teleoscope_loading } = useSWRAbstract("teleoscope", `/api/teleoscopes/${teleoscope_id}`);
  const { teleoscopes_raw } = useSWRAbstract("teleoscopes_raw", `/api/sessions/${session_id}/teleoscopes`);
  const teleoscopes = teleoscopes_raw?.map((t) => {
    var ret = {
      _id: t._id,
      label: t.history[0].label
    }
    return ret;
  });
  
  var data = [];
  if (teleoscope) {
    var history = teleoscope["history"];
    var history_item = history[0];
    data = history_item["rank_slice"];
  }

  if (teleoscope_id == "%teleoscope") {
    return (


        <div style={{overflow:"auto", height: "100%"}}>
            
    
        <Typography variant="h5" gutterBottom component="div" sx={{ p: 2, pb: 0 }}>
        All Teleoscopes
        </Typography>
        <List>
            {teleoscopes?.map((t) => { 
              return ( <ListItem 
                          id={t._id}
                          onClick={() => setTeleoscope_id(t._id)}
                      >{t.label}
                       </ListItem>
              )
            })}
        </List>
        </div>
    )    

  } else {
    return (
      <div style={{overflow:"auto", height: "100%"}}>

    
      <Typography variant="h5" gutterBottom component="div" sx={{ p: 2, pb: 0 }}>
          Teleoscope: {teleoscope?.history[0].label}
      </Typography>
        {teleoscope_loading ? <LoadingButton loading={true}/> : <PostList pagination={true} data={data}></PostList>}
      </div>
    )
    
  }


  
}