// WindowTopBar.js
import React from "react";

// MUI
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";

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
      <IconButton size="small">{icon}</IconButton>
      <Typography variant="body1" component="div" sx={{ pt: 0.6 }}>
        {title}
      </Typography>
      <CloseButton id={id} size="small" />
    </Stack>
  );
}
