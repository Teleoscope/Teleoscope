import React, { useContext } from "react";

// mui
import { List, Stack, IconButton, Tooltip } from "@mui/material";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import CommentIcon from "@mui/icons-material/Comment";
// actions
import { useAppDispatch } from "@/util/hooks";
import { dragged } from "@/actions/windows";

// utils
import { swrContext } from "@/util/swr";
import ButtonActions from "../ButtonActions";
import CreateIcon from "@mui/icons-material/Create";
import { StompContext } from "../Stomp";

function NotePaletteItem(props) {
  const swr = useContext(swrContext);
  const { obj } = swr.useSWRAbstract(
    "obj",
    `${props.note.key}/${props.note.oid}`
  );
  let title = "Note";
  let description = "";
  if (props.note.key == "document" && obj) {
    title = obj.title;
    description = obj.text.slice(0, 20) + "...";
  }

  return (
    <ListItem key={title}>
      <ListItemIcon>
        <CommentIcon />
      </ListItemIcon>
      <ListItemText primary={title} secondary={description} />
    </ListItem>
  );
}

const NewNote = () => {
  const client = useContext(StompContext);

  const handleNewNote = () => {
    client.add_note();
  };
  return (
    <Tooltip
      title="Copy metadata to clipboard"
      key="Copy metadata to clipboard"
    >
      <IconButton onClick={handleNewNote}>
        <CreateIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

export default function NotePalette(props) {
  const swr = useContext(swrContext);
  const { notes } = swr.useSWRAbstract("notes", `notes/`);
  const dispatch = useAppDispatch();

  return (
    <Stack style={{ overflow: "auto", height: "100%" }}>
      <ButtonActions inner={NewNote}></ButtonActions>
      <List>
        {notes?.map((n) => {
          return (
            <div
              draggable={true}
              key={n._id}
              onDragStart={(e: React.DragEvent<HTMLDivElement>): void => {
                dispatch(dragged({ id: n?._id + "%note", type: "Note" }));
              }}
            >
              <NotePaletteItem note={n} />
            </div>
          );
        })}
      </List>
    </Stack>
  );
}
