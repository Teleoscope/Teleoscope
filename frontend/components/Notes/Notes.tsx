// mui
import {
  Stack,
  List,
  ListItem,
  ListItemIcon
} from "@mui/material";

import { ContentState, convertToRaw } from "draft-js";

// custom
import EditableText from "@/components/EditableText";
import Deleter from "@/components/Deleter";

// actions
import { useAppSelector, useAppDispatch, useWindowDefinitions } from "@/util/hooks";
import { RootState } from "@/stores/store";

import { addNote, relabelNote, removeNote } from "@/actions/windows";

// utils
import { useSWRHook } from "@/util/swr";
import { NewItemForm } from "@/components/NewItemForm";
import { onDragStart } from "@/util/drag";

export default function Notes(props) {
  const wdefs = useWindowDefinitions();
  const workflow_id = useAppSelector((state: RootState) => state.activeSessionID.value);

  const settings = useAppSelector((state) => state.windows.settings);

  const swr = useSWRHook();
  const { notes_raw } = swr.useSWRAbstract(
    "notes_raw",
    `notes/${workflow_id}`
  );
  const dispatch = useAppDispatch();

  const notes = notes_raw?.map((n) => {
    const ret = {
      _id: n._id,
      label: n.history[0].label,
    };
    return ret;
  });



    const handleNewNote = (e) => {
      const content = convertToRaw(ContentState.createFromText(" "));

      dispatch(addNote({label: e.target.value, content: content}));
    };

    
  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      <NewItemForm 
        label="Create new note" 
        HandleSubmit={handleNewNote}      
      />
      <List>
        {notes?.map((n) => (
          <div
            key={n._id}
            draggable={true}
            style={{ position: "relative" }}
            onDragStart={(e) =>
              onDragStart(e, n._id, "Note")
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
                      {wdefs.definitions()["Note"].icon()}
                  </ListItemIcon>

                  <EditableText
                    initialValue={n.label}
                    callback={(label) => dispatch(relabelNote({note_id: n._id, label: label}))}
                  />
                </Stack>
                <Deleter 
                  callback={() => dispatch(removeNote({note_id: n._id}))} 
                  color={settings.color}
                />    
              </Stack>
            </ListItem>
          </div>
        ))}
      </List>
    </div>
  );
}
