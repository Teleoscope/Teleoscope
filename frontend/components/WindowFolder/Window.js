// Window.js
import React, { useState } from "react";

// custom
import WindowTopBar from "./WindowTopBar";

// mui
import Chip from "@mui/material/Chip";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Divider from "@mui/material/Divider";

// actions
import { useDispatch } from "react-redux";
import { removeWindow } from "../../actions/windows";

export default function Window (props) {
  const w = props.windata;
  const dispatch = useDispatch();

  const handleDelete = () => {
    dispatch(removeWindow(props.id));
  };

  if (props.size.width < props.size.minWidth + 1 ) {
    return (
      <Chip
        windata={w}
        icon={props.icon}
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
    <Card
      variant="outlined"
      style={{
        backgroundColor: "white",
        height: "100%",
        width: "100%",
      }}
      sx={{
        boxShadow: "1",
      }}
    >
        <WindowTopBar
          title={props.title}
          id={props.id}
          icon={props.icon}
          isChecked={w.isChecked}
        />
        <Divider />
      <div
        className="nodrag nowheel"
        style={{ overflow: "auto", width: "100%", height: "100%" }}
      >
        {props.inner}
      </div>
     
    </Card>
  );
}
