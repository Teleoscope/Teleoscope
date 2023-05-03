import React, { useState } from "react";

// mui
import { Typography, Box } from "@mui/material";

export default function DocumentText(props) {
  const [selectedText, setSelectedText] = useState("");

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selectedString = selection.toString().trim();

    // Check if selected text matches a complete word
    const isWordMatch = selectedString
      .split(/\s+/)
      .every((word) => text.indexOf(word) >= 0);

    if (isWordMatch) {
      setSelectedText(selectedString);
    } else {
      setSelectedText("");
    }
  };
  const text = props.text ? props.text : "Content not available.";
  const selectedWords = selectedText.split(" ").filter((word) => word !== "");

  return (
    <Box sx={{ height: "100%", overflow: "auto" }}>
      <Typography
        variant="body2"
        sx={{ margin: "1em", userSelect: "text" }}
        onMouseUp={handleTextSelection}
      >
        {text.split(" ").map((word, index) => {
          const isSelected =
            selectedText.split(/\s+/).indexOf(word.trim()) >= 0;
          return (
            <span
              key={index}
              style={{ background: isSelected ? "yellow" : "transparent" }}
            >
              {word}{" "}
            </span>
          );
        })}
      </Typography>
    </Box>
  );
}
