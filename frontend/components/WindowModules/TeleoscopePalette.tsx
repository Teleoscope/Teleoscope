import React, { useContext } from "react";

// mui
import {
  IconButton,
  Stack,
  TextField,
  List,
  ListItem,
  ListItemIcon
} from "@mui/material";

import FlareIcon from "@mui/icons-material/Flare";
import DeleteIcon from "@mui/icons-material/Delete";

// custom
import EditableText from "../EditableText";

// actions
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { RootState } from "@/stores/store";

// utils
import { swrContext } from "@/util/swr";
import withDroppable from "../DropItem";
import { StompContext } from "@/components/Stomp";

export default function TeleoscopePalette(props) {
  const client = useContext(StompContext)

  const session_id = useAppSelector(
    (state: RootState) => state.activeSessionID.value
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

  const Item = (props) => {
    return (
      <ListItem>


                <Stack
                  sx={{ width: "100%" }}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Stack direction="row" alignItems="center">
                    <ListItemIcon>
                      <IconButton>
                        <FlareIcon />
                      </IconButton>
                    </ListItemIcon>

                    <EditableText
                      initialValue={props.teleoscope.label}
                      callback={(label) => client.relabel_teleoscope(label, props.teleoscope._id)}
                    />
                  </Stack>
                  <IconButton
                    onClick={() => client.remove_teleoscope(props.teleoscope._id, session_id)}
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



    );
  };
  const Droppable = withDroppable(Item);

  const [value, setValue] = React.useState(null);

  const keyChange = (e) => {
    if (e.code == "Enter") {
      client.initialize_teleoscope(session_id, value)  }
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
          label="Create new Teleoscope..."
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
        {teleoscopes?.map((t) => (
          <Droppable
            teleoscope={t}
            key={t._id}
            id={t._id}
            type="Teleoscope"
            typetag="teleoscope"
          />
        ))}
      </List>
      </Stack>
    </div>
  );
}
