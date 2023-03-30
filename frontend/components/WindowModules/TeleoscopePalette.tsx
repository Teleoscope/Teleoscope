import React from "react";

// mui
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import FlareIcon from "@mui/icons-material/Flare";

// actions
import { useAppSelector, useAppDispatch } from "../../hooks";
import { RootState } from "../../stores/store";

// utils
import useSWRAbstract from "../../util/swr";
import withDroppable from "../DropItem";

export default function TeleoscopePalette(props) {
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

  return (
    <div style={{ overflow: "auto", height: "100%" }}>
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
    </div>
  );
}
