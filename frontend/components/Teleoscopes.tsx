import React, { useContext } from "react";

// mui
import {
  IconButton,
  Stack,
  TextField,
  List,
  ListItem,
  ListItemIcon,
} from "@mui/material";

import FlareIcon from "@mui/icons-material/Flare";
import DeleteIcon from "@mui/icons-material/Delete";

// custom
import EditableText from "@/components/EditableText";

// actions
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { RootState } from "@/stores/store";

// utils
import { swrContext } from "@/util/swr";
import { StompContext } from "@/components/Stomp";
import { NewItemForm } from "./NewItemForm";

export default function Teleoscopes(props) {
  const client = useContext(StompContext);

  const session_id = useAppSelector(
    (state: RootState) => state.activeSessionID.value
  );

  const settings = useAppSelector(
    (state: RootState) => state.windows.settings
  );

  
  const swr = useContext(swrContext);
  const { teleoscopes_raw } = swr.useSWRAbstract(
    "teleoscopes_raw",
    `sessions/${session_id}/teleoscopes`
  );
  const dispatch = useAppDispatch();

  const teleoscopes = teleoscopes_raw?.map((t) => {
    const ret = {
      _id: t._id,
      label: t.history[0].label,
    };
    return ret;
  });

  const keyChange = (e) => client.initialize_teleoscope(session_id, e.target.value);

  const onDragStart = (event, id, type, typetag) => {
    event.dataTransfer.setData("application/reactflow/type", type);
    event.dataTransfer.setData("application/reactflow/id", `${id}%${typetag}`);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      <Stack>
        <NewItemForm label="Create new Teleoscope..."  HandleSubmit={keyChange} /> 
        <List>
          {teleoscopes?.map((t) => (
            <div
              key={t._id}
              draggable={true}
              style={{ position: "relative" }}
              onDragStart={(e) =>
                onDragStart(
                  e,
                  t._id + "%" + "teleoscope",
                  "Teleoscope",
                  "teleoscope"
                )
              }
            >
              <ListItem key={t._id}>
                <Stack
                  sx={{ width: "100%" }}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Stack direction="row" alignItems="center">
                    <ListItemIcon>
                      <FlareIcon />
                    </ListItemIcon>

                    <EditableText
                      initialValue={t.label}
                      callback={(label) =>
                        client.relabel_teleoscope(label, t._id)
                      }
                    />
                  </Stack>
                  <IconButton
                    onClick={() => client.remove_teleoscope(t._id, session_id)}
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
      </Stack>
    </div>
  );
}
