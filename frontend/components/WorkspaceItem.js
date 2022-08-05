import React, { useState, useEffect, useRef } from 'react';

// material ui
import Stack from '@mui/material/Stack';
import Grid from "@mui/material/Grid";
import CardActionArea from '@mui/material/CardActionArea';
import Box from '@mui/material/Box';

// icons
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";

// actions
import { useSelector, useDispatch } from "react-redux"

// custom components

//utils
import useSWRAbstract from "../util/swr"


export default function WorkspaceItem(props) {

  
  const { post, post_loading, post_error } = useSWRAbstract("post", `/api/posts/${props.id}`);

  return (
    
    
    <div></div>
  );
}
