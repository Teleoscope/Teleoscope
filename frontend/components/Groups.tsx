// NewGroupForm.js
import React from "react";
import { TextField, Stack } from "@mui/material";

export const NewGroupForm = ({ color, keyChange }) => (
  <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="center"
    style={{ margin: 0 }}
  >
    <TextField
      label="Create new group..."
      placeholder="Type label and press enter."
      variant="standard"
      onKeyDown={keyChange}
      InputLabelProps={{
        sx: {
          "&.Mui-focused": {
            color: color,
          },
        },
      }}
      sx={{
        width: "100%",
        margin: 1,
        "& .MuiInput-underline:after": { borderBottomColor: color },
      }}
    />
  </Stack>
);

// GroupItem.js

import { ListItem, ListItemIcon, IconButton } from "@mui/material";
import {
  Folder as FolderIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import EditableText from "@/components/EditableText";
import ColorPicker from "@/components/ColorPicker";

export const GroupItem = ({
  g,
  showColorPicker,
  setShowColorPicker,
  onDragStart,
  removeGroup,
  relabelGroup,
  recolorGroup,
  color,
}) => (
  <div
    key={g._id}
    draggable={true}
    style={{ position: "relative" }}
    onDragStart={(e) => onDragStart(e, g._id + "%" + "group", "Group", "group")}
  >
    <ListItem>
      <Stack
        sx={{ width: "100%" }}
        direction="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack direction="row" alignItems="center">
          <ListItemIcon>
            <IconButton onClick={() => setShowColorPicker(!showColorPicker)}>
              <FolderIcon sx={{ color: g.history[0].color }} />
            </IconButton>
          </ListItemIcon>

          <EditableText
            initialValue={g.history[0].label}
            callback={(label) => relabelGroup(label, g._id)}
          />
        </Stack>
        <IconButton onClick={() => removeGroup(g._id)}>
          <DeleteIcon
            sx={[
              {
                "&:hover": {
                  color: color,
                },
              },
            ]}
          ></DeleteIcon>
        </IconButton>
      </Stack>
    </ListItem>
    {showColorPicker ? (
      <ColorPicker
        defaultColor={g.history[0].color}
        onChange={(color) => {
          recolorGroup(color, g._id);
          setShowColorPicker(false);
        }}
      ></ColorPicker>
    ) : (
      <span></span>
    )}
  </div>
);

// GroupList.js

import { List } from "@mui/material";

export const GroupList = ({ groups, ...props }) => (
  <List>
    {groups?.map((g) => (
      <GroupItem key={g._id} g={g} {...props} />
    ))}
  </List>
);

import { useContext, useState } from "react";
import { Divider } from "@mui/material";
import { swrContext } from "@/util/swr";
import { useAppSelector } from "@/util/hooks";
import { StompContext } from "@/components/Stomp";
import randomColor from "randomcolor";
import ButtonActions from "@/components/ButtonActions";
import {
  SaveDocxAction,
  CopyJsonAction,
  CopyTextAction,
  ClusterButtonAction,
} from "@/components/GroupsActions";

export default function Groups(props) {
  const swr = useContext(swrContext);
  const client = useContext(StompContext);
  const session_id = useAppSelector((state) => state.activeSessionID.value);
  const { groups } = props.demo
    ? props.demoGroups
    : swr.useSWRAbstract("groups", `sessions/${session_id}/groups`);
  const { session } = swr.useSWRAbstract("session", `sessions/${session_id}`);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const runClusters = () => {
    client.cluster_by_groups(
      groups.map((g) => g._id),
      session_id
    );
  };

  const keyChange = (e) => {
    if (e.code == "Enter") {
      client.add_group(e.target.value, randomColor(), session_id);
    }
  };

  const onDragStart = (event, id, type, typetag) => {
    event.dataTransfer.setData("application/reactflow/type", type);
    event.dataTransfer.setData("application/reactflow/id", `${id}%${typetag}`);
    event.dataTransfer.effectAllowed = "move";
  };

  const fetchgroups = async () => {
    const out = [];
    for (const group of groups) {
      const g = group;
      g["documents"] = [];
      for (const doc of g.history[0].included_documents) {
        const response = await fetch(
          `/api/${swr.subdomain}/document/${doc}`
        ).then((res) => res.json());
        g["documents"].push(response);
      }
      out.push(g);
    }
    return out;
  };

  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      <NewGroupForm color={props.color} keyChange={keyChange} />

      <Divider />

      <ButtonActions
        inner={[
          [SaveDocxAction, { fetchgroups, session }],
          [CopyJsonAction, { fetchgroups }],
          [CopyTextAction, { fetchgroups }],
          [ClusterButtonAction, { runClusters }],
        ]}
      />

      <GroupList
        groups={groups}
        showColorPicker={showColorPicker}
        setShowColorPicker={setShowColorPicker}
        onDragStart={onDragStart}
        removeGroup={(id) => client.remove_group(id, session_id)}
        relabelGroup={(label, id) => client.relabel_group(label, id)}
        recolorGroup={(color, id) => {
          client.recolor_group(color, id);
          setShowColorPicker(false);
        }}
        color={props.color}
      />
    </div>
  );
}
