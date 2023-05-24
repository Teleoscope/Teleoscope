import React from "react";

// mui
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";

// actions
import { useDispatch } from "react-redux";
import { removeWindow } from "@/actions/windows";

export default function CloseButton(props) {
  const dispatch = useDispatch();
  return (
    <IconButton
      sx={props.sx}
      {...props}
      onClick={() => dispatch(removeWindow(props.id))}
    >
      <CloseIcon sx={props.sx} fontSize="inherit" />
    </IconButton>
  );
}
