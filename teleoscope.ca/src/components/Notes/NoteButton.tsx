// mui
import IconButton from "@mui/material/IconButton";
import CommentIcon from "@mui/icons-material/Comment";

import { useAppDispatch } from "@/lib/hooks";

export default function NoteButton(props) {
  const dispatch = useAppDispatch()

  const handleAddNote = () => {
  };

  return (
    <IconButton onClick={() => handleAddNote()}>
      <CommentIcon fontSize="small" />
    </IconButton>
  );
}
