import React from 'react';

// mui
import MaximizeIcon from "@mui/icons-material/Maximize";
import IconButton from "@mui/material/IconButton";

// actions
import { useDispatch } from "react-redux";
import { maximizeWindow } from "../actions/windows";

export default function CloseButton(props) {
  const dispatch = useDispatch();

  return (
    <IconButton sx={props.sx} onClick={() => dispatch(maximizeWindow(props.id))}>
      <MaximizeIcon sx={props.sx} />
    </IconButton>
  )
}