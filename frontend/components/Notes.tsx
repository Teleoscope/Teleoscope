import React, { useContext } from "react";

// mui
import {
  IconButton,
  Stack,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  Tooltip,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import CreateIcon from "@mui/icons-material/Create";
import { ContentState, convertToRaw } from "draft-js";

// custom
import EditableText from "@/components/EditableText";
import ButtonActions from "@/components/ButtonActions";

// actions
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { RootState } from "@/stores/store";

// utils
import { swrContext } from "@/util/swr";
import { StompContext } from "@/components/Stomp";

export default function Notes(props) {
  const client = useContext(StompContext);

  const session_id = useAppSelector(
    (state: RootState) => state.activeSessionID.value
  );
  const swr = useContext(swrContext);
  const { notes_raw } = swr.useSWRAbstract(
    "notes_raw",
    `sessions/${session_id}/notes`
  );
  const dispatch = useAppDispatch();

  const notes = notes_raw?.map((n) => {
    const ret = {
      _id: n._id,
      label: n.history[0].label,
    };
    return ret;
  });

  const [value, setValue] = React.useState(null);

  const onDragStart = (event, id, type, typetag) => {
    event.dataTransfer.setData("application/reactflow/type", type);
    event.dataTransfer.setData("application/reactflow/id", `${id}%${typetag}`);
    event.dataTransfer.effectAllowed = "move";
  };

  const NewNote = () => {
    const client = useContext(StompContext);
    const session_id = useAppSelector((state) => state.activeSessionID.value);

    const handleNewNote = () => {
      const content = convertToRaw(ContentState.createFromText(" "));
      client.add_note(session_id, "new note", content);
    };

    return (
      <Tooltip title="Create new note" key="Create new note">
        <IconButton onClick={handleNewNote}>
          <CreateIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );
  };

  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      <ButtonActions inner={[[NewNote, {}]]}></ButtonActions>
      <List>
        {notes?.map((n) => (
          <div
            key={n._id}
            draggable={true}
            style={{ position: "relative" }}
            onDragStart={(e) =>
              onDragStart(e, n._id + "%" + "note", "Note", "note")
            }
          >
            <ListItem key={n._id}>
              <Stack
                sx={{ width: "100%" }}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Stack direction="row" alignItems="center">
                  <ListItemIcon>
                    <IconButton>
                      <CreateIcon />
                    </IconButton>
                  </ListItemIcon>

                  <EditableText
                    initialValue={n.label}
                    callback={(label) => client.relabel_note(n._id, label)}
                  />
                </Stack>
                <IconButton
                  onClick={() => client.remove_note(n._id, session_id)}
                >
                  <DeleteIcon
                    sx={[
                      {
                        "&:hover": {
                          color: props.color,
                        },
                      },
                    ]}
                  ></DeleteIcon>
                </IconButton>
              </Stack>
            </ListItem>
          </div>
        ))}
      </List>
    </div>
  );
}
