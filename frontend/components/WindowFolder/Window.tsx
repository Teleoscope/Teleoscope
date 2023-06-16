// Window.js
import React from "react";

// custom
import WindowTopBar from "@/components/WindowFolder/WindowTopBar";

// mui
import { Chip, Stack, Paper, Box, Divider } from "@mui/material";

// actions
import { useDispatch } from "react-redux";
import { removeWindow, maximizeWindow } from "@/actions/windows";

export default function Window(props) {
  const w = props.windata;
  const dispatch = useDispatch();

  const handleDelete = () => {
    dispatch(removeWindow(props.id));
  };

  if (props.size.width < props.size.minWidth + 1) {
    return (
      <Chip
        windata={w}
        icon={props.icon}
        onDoubleClick={() => dispatch(maximizeWindow({ id: props.id }))}
        sx={{
          border: w.isChecked
            ? `2px solid ${props.color}`
            : "1px solid #DDDDDD",
          boxShadow: "1",
          cursor: "move",
          backgroundColor: "white",
          [`& .MuiChip-icon`]: {
            color: props.color,
            fontSize: "1.5em",
            marginLeft: "1em",
          },
        }}
      />
    );
  }

  if (props.size.height < props.size.minHeight + 1) {
    return (
      <Chip
        windata={w}
        label={props.title}
        icon={props.icon}
        onDoubleClick={() => dispatch(maximizeWindow({ id: props.id }))}
        clickable
        onDelete={handleDelete}
        className="drag-handle"
        sx={{
          border: w.isChecked
            ? `2px solid ${props.color}`
            : "1px solid #DDDDDD",
          boxShadow: "1",
          cursor: "move",
          backgroundColor: "white",
          width: props.size.width,
          [`& .MuiChip-icon`]: {
            color: props.color,
          },
        }}
      />
    );
  }

  return (
    <Paper
      variant="outlined"
      style={{
        height: props.size.height,
        width: props.size.width,
      }}
      sx={{
        boxShadow: "1",
      }}
    >
      <Stack
        style={{
          height: props.size.height - 2,
          width: props.size.width - 2,
        }}
      >
        <WindowTopBar
          title={props.title}
          id={props.id}
          icon={props.icon}
          isChecked={w.isChecked}
        />
        <Divider />
        <Box
          className="nodrag nowheel"
          sx={{
            flexGrow: 1,
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {props.inner}
        </Box>
      </Stack>
    </Paper>
  );
}
