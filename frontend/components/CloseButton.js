import React from 'react';

// mui
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";

// actions
import { useDispatch } from "react-redux";
import {removeWindow} from "../actions/windows";

export default function CloseButton(props) {
  const dispatch = useDispatch();

  return (
    <IconButton size="small" onClick={() => dispatch(removeWindow(props.id))}>
      <CloseIcon fontSize="small" />
    </IconButton>
  )
}