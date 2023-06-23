// WindowTopBar.js
import React from "react";

// MUI
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

// custom
import CloseButton from "@/components/CloseButton";

// actions
import { useDispatch } from "react-redux";
import { minimizeWindow } from "@/actions/windows";

export default function WindowTopBar({id, icon, title}) {
  const dispatch = useDispatch();
  return (
    <Stack
      sx={{ cursor: "move" }}
      direction="row"
      alignItems="flex-start"
      justifyContent="space-between"
      onDoubleClick={() => dispatch(minimizeWindow({ id: id }))}
    >
      
      <Typography variant="body1" component="div" sx={{ padding: 0.6 }}>
        {icon} {title}
      </Typography>
      <CloseButton id={id} size="small" />
    </Stack>
  );
}
