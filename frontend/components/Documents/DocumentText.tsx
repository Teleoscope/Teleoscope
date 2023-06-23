import React, { useState } from "react";

// mui
import { Typography, Box, Popover } from "@mui/material";
import Snippet from "../Snippet";
import Highlighter from "../Highlighter";

export default function DocumentText(props) {
  const [selectedText, setSelectedText] = useState("");
  const [popoverAnchorEl, setPopoverAnchorEl] = useState(null);

  const handleTextSelection = (e) => {
    const selection = window.getSelection();
    const selectedString = selection.toString().trim();

    const text = props.text ? props.text : "Content not available.";

    // Check if selected text matches a complete word
    const isWordMatch = selectedString
      .split(/\s+/)
      .every((word) => text.indexOf(word) >= 0);

    if (isWordMatch) {
      setSelectedText(selectedString);
      setPopoverAnchorEl(e.currentTarget);
    } else {
      setSelectedText("");
      setPopoverAnchorEl(null);
    }
  };

  const handleClose = () => {
    setPopoverAnchorEl(null);
  };

  const open = Boolean(popoverAnchorEl);

  return (
    <Box sx={{ height: "100%", overflow: "auto" }}>
      <Typography
        variant="body2"
        sx={{ margin: "1em", userSelect: "text" }}
        onMouseUp={handleTextSelection}
      >
        <Highlighter>{props.text}</Highlighter>
      </Typography>
      <Popover
        id={open ? "simple-popover" : undefined}
        open={open}
        anchorEl={popoverAnchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Snippet text={selectedText} {...props}></Snippet>
      </Popover>
    </Box>
  );
}
