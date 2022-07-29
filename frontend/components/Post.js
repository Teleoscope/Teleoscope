// Window.js
import React, { useState } from "react";

// custom
import WorkspaceItem from "../components/WorkspaceItem";
import CloseButton from "../components/CloseButton";
import MinimizeButton from "../components/MinimizeButton";
import MaximizeButton from "../components/MaximizeButton";
import PostTitle from "./PostTitle"
import PostText from "./PostText"
import GroupSelector from "./GroupSelector"
import Expander from "./Expander"
import NoteButton from "./NoteButton"

// mui
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Paper from '@mui/material/Paper';
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Stack from '@mui/material/Stack';
import Grid from "@mui/material/Grid";
import ShortTextIcon from '@mui/icons-material/ShortText';
import IconButton from '@mui/material/IconButton';
import CardActionArea from '@mui/material/CardActionArea';
import Divider from '@mui/material/Divider';

// actions
import { checker } from "../actions/checkedPosts";
import { useSelector, useDispatch } from "react-redux";
import { minimizeWindow, maximizeWindow } from "../actions/windows";

const button_style = {
  fontSize: 15,
  color: "white",
  marginBottom: "0.15em",
  padding: "0",
  cursor: "pointer"
}

//utils
import useSWRAbstract from "../util/swr"
import { PreprocessTitle, PreprocessText } from "../util/Preprocessers"

export default function Post(props) {
  const [hover, setHover] = useState(false);
  const { post } = useSWRAbstract("post", `/api/posts/${props.id}`);
  const title = post ? PreprocessTitle(post.title) : false;
  const text = post ? PreprocessText(post.selftext) : false;  

    // strangely, this is needed
    const dispatch = useDispatch();
    const handleClick = (id, index) => {
      if (index < 0) {
        dispatch(checker(id))
      } else {
        dispatch(checker(id))
      }
    } 

  return (
    <div style={{overflow: "auto", height: "100%", marginTop: "0em"}}>
        
          <Stack
            direction="row"
            justifyContent="right"
            alignItems="center"
            style={{
              // backgroundColor:"yellow", 
              
              margin: 0
            }}
          >
            <NoteButton id={props.id} />
            <GroupSelector id={props.id} />
          </Stack>
          <Divider />    
        <PostText text={text} /> 
      
    </div>
  )
}
