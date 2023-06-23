// NoteButton.js
import React, { useContext } from "react";

// mui
import IconButton from "@mui/material/IconButton";
import CommentIcon from "@mui/icons-material/Comment";

// contexts
import { StompContext } from "@/components/Stomp";

export default function NoteButton(props) {
  const client = useContext(StompContext);

  const handleAddNote = () => {
    client.add_note(props.id, props.type);
  };

  return (
    <IconButton onClick={() => handleAddNote()}>
      <CommentIcon fontSize="small" />
    </IconButton>
  );
}
