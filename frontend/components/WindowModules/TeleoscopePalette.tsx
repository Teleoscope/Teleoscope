import React from "react";

// mui
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import FlareIcon from "@mui/icons-material/Flare";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";

// actions
import { useAppSelector, useAppDispatch } from "../../hooks";
import { RootState } from "../../stores/store";

// utils
import useSWRAbstract from "../../util/swr";
import withDroppable from "../DropItem";
import { Stomp } from "../Stomp";

export default function TeleoscopePalette(props) {
  const userid = useAppSelector((state) => state.activeSessionID.userid);

  const client = Stomp.getInstance();
  client.userId = userid;
  const session_id = useAppSelector(
    (state: RootState) => state.activeSessionID.value
  );
  const { teleoscopes_raw } = useSWRAbstract(
    "teleoscopes_raw",
    `/api/sessions/${session_id}/teleoscopes`
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
        <ListItemIcon>
          <FlareIcon />
        </ListItemIcon>
        <ListItemText
          primary={props.teleoscope.label}
          secondary={props.teleoscope._id}
        />
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
