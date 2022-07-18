import React from 'react';

// mui
import MinimizeIcon from "@mui/icons-material/Minimize";
import IconButton from "@mui/material/IconButton";

// actions
import { useDispatch } from "react-redux";
import { minimizeWindow } from "../actions/windows";

export default function CloseButton(props) {
  const dispatch = useDispatch();

  return (
    <IconButton sx={props.sx} onClick={() => dispatch(minimizeWindow(props.id))}>
      <MinimizeIcon sx={props.sx} />
    </IconButton>
  )
}