import { Stack } from "@mui/material";


// GroupItem.js

import { ListItem, ListItemIcon, IconButton } from "@mui/material";
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
}) => {
const wdefs = useWindowDefinitions();
return (
  <div
    key={g._id}
    draggable={true}
    style={{ position: "relative" }}
    onDragStart={(e) => onDragStart(e, g._id, "Group")}
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
              {wdefs.definitions()["Group"].icon(g)}
            </IconButton>
          </ListItemIcon>

          <EditableText
            initialValue={g.history[0].label}
            callback={(label) => relabelGroup(label, g._id)}
          />
        </Stack>
        
        <Deleter callback={() => removeGroup(g._id)} color={color} />
        
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
)};

// GroupList.js

import { List } from "@mui/material";

export const GroupList = ({ groups, ...props }) => (
  <List>
    {groups?.map((g) => (
      <GroupItem key={g._id} g={g} {...props} />
    ))}
  </List>
);

import { useState } from "react";
import { Divider } from "@mui/material";
import { useSWRHook } from "@/util/swr";
import { useAppSelector, useWindowDefinitions } from "@/lib/hooks";
import randomColor from "randomcolor";
import ButtonActions from "@/components/ButtonActions";
import {
  SaveXLSXAction,
  SaveDocxAction,
  CopyJsonAction,
  CopyTextAction,
} from "@/components/Groups/GroupsActions";
import { NewItemForm } from "@/components/NewItemForm";
import { onDragStart } from "@/util/drag";
import Deleter from "@/components/Deleter";
import { useAppDispatch } from "@/lib/hooks";
import { addGroup, recolorGroup, relabelGroup, removeGroup } from "@/actions/windows";

export default function Groups(props) {
  const swr = useSWRHook();
  const dispatch = useAppDispatch()
  const workflow_id = useAppSelector((state) => state.activeSessionID.value);
  const settings = useAppSelector((state) => state.windows.settings);

  const { groups } = props.demo
    ? props.demoGroups
    : swr.useSWRAbstract("groups", `sessions/${workflow_id}/groups`);
  const { session } = swr.useSWRAbstract("session", `sessions/${workflow_id}`);
  const [showColorPicker, setShowColorPicker] = useState(false);

  

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

      <NewItemForm 
        label={"Create new group..."} 
        HandleSubmit={(e) => dispatch(addGroup({
          label: e.target.value,
          color: randomColor(),
          documents: []
        }))}
      />

      <Divider />

      <ButtonActions
        inner={[
          [SaveXLSXAction, { fetchgroups, session }],
          [SaveDocxAction, { fetchgroups, session }],
          [CopyJsonAction, { fetchgroups }],
          [CopyTextAction, { fetchgroups }],
          // [ClusterButtonAction, { runClusters }],
        ]}
      />

      <GroupList
        groups={groups}
        showColorPicker={showColorPicker}
        setShowColorPicker={setShowColorPicker}
        onDragStart={onDragStart}
        removeGroup={(id) => dispatch(removeGroup({group_id: id}))}
        relabelGroup={(label, id) => dispatch(relabelGroup({label: label, group_id: id}))}
        recolorGroup={(color, id) => {
          dispatch(recolorGroup({color: color, group_id: id}));
          setShowColorPicker(false);
        }}
        color={settings.color}
      />
    </div>
  );
}
