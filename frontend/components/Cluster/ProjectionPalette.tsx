import React, { useContext } from "react";

// mui
import {
  IconButton,
  Stack,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";

import {
  Flare as FlareIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  Diversity2 as Diversity2Icon,
} from "@mui/icons-material";

// custom
import EditableText from "@/components/EditableText";

// actions
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { RootState } from "@/stores/store";

// utils
import { swrContext } from "@/util/swr";
import { StompContext } from "@/components/Stomp";

export default function Clusters(props) {
  const client = useContext(StompContext);

  const session_id = useAppSelector(
    (state: RootState) => state.activeSessionID.value
  );
  const swr = useContext(swrContext);
  const { projections_raw } = swr.useSWRAbstract(
    "projections_raw",
    `sessions/${session_id}/projections`
  );

  const projections = projections_raw?.map((p) => {
    const ret = {
      _id: p._id,
      label: p.history[0].label,
    };
    return ret;
  });

  const [value, setValue] = React.useState(null);

  const keyChange = (e) => {
    if (e.code == "Enter") {
      client.initialize_projection(session_id, value);
    }
  };
  const onDragStart = (event, id, type, typetag) => {
    event.dataTransfer.setData("application/reactflow/type", type);
    event.dataTransfer.setData("application/reactflow/id", `${id}%${typetag}`);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      <Stack>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          style={{ margin: 0 }}
        >
          <TextField
            label="Create new Projection..."
            placeholder="Type label and press enter."
            variant="standard"
            onKeyDown={(e) => keyChange(e)}
            onChange={(e) => setValue(e.target.value)}
            InputLabelProps={{
              sx: {
                "&.Mui-focused": {
                  color: props.color,
                },
              },
            }}
            sx={{
              width: "100%",
              margin: 1,
              // '& .MuiInput-underline:before': {borderBottomColor: props.color},
              "& .MuiInput-underline:after": { borderBottomColor: props.color },
              // '& .MuiInputLabel-root': {borderBottomColor: props.color},
            }}
          />
        </Stack>
        <List>
          {projections?.map((p) => {
            return (
              <div
                key={p._id}
                style={{ overflow: "auto", height: "100%" }}
                draggable={true}
                onDragStart={(e) =>
                  onDragStart(
                    e, 
                    p._id + "%projection", 
                    "Projection", 
                    "projection")
                }
              >
                <ListItem key={p._id}>
                  <Stack
                    sx={{ width: "100%" }}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Stack direction="row" alignItems="center">
                      <ListItemIcon>
                        <Diversity2Icon />
                      </ListItemIcon>

                      <EditableText
                        initialValue={p.label}
                        callback={(label) =>
                          client.relabel_projection(label, p._id)
                        }
                      />
                    </Stack>
                    <IconButton
                      onClick={() => client.remove_projection(p._id, session_id)}
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
            );
          })}
        </List>
      </Stack>
    </div>
  );
}
