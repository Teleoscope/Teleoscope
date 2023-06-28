// mui
import IconButton from "@mui/material/IconButton";
import CommentIcon from "@mui/icons-material/Comment";

// contexts
import { useStomp } from "@/components/Stomp";

export default function NoteButton(props) {
  const client = useStomp();

  const handleAddNote = () => {
    client.add_note(props.id, props.type);
  };

  return (
    <IconButton onClick={() => handleAddNote()}>
      <CommentIcon fontSize="small" />
    </IconButton>
  );
}
