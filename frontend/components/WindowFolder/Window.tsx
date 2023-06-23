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

  if (props.size.width < props.size.minWidth + 1 || props.size.height < props.size.minHeight + 1) {
    return (
      <Chip
        label={
          <Box 
            sx={{ 
              display: 'flex', 
              flexShrink: 2, 
              width: props.size.width,
              paddingLeft: "2px"
            }}
          >{props.title}
          </Box>
        }
        // variant="filled"
        avatar={<span style={{width: "1em", padding: "0.425em"}}>{props.icon}</span>}
        onDoubleClick={() => dispatch(maximizeWindow({ id: props.id }))}
        onDelete={handleDelete}
        sx={{
          border: w.isChecked
            ? `2px solid ${props.color}`
            : "1px solid #DDDDDD",
          boxShadow: "1",
          cursor: "move",
          
          backgroundColor: "white",
          [`& .MuiChip-icon`]: {
            color: props.color,
            // fontSize: "1.5em",
            // marginLeft: "1em",
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
        overflow: "hidden",
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
