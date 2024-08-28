import { Stack } from "@mui/material";


// GroupItem.js

import { ListItem, ListItemIcon, IconButton } from "@mui/material";
import EditableText from "@/components/EditableText";
import ColorPicker from "@/components/ColorPicker";

export const GroupItem = ({
  g,
  removeGroup,
  relabelGroup,
  color,
}) => {
  const { data: graph_item } = useSWRF(`/api/group?group=${g._id}`)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const dispatch = useAppDispatch()
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
              {WindowDefinitions("Group").icon(g)}
            </IconButton>
          </ListItemIcon>

          <EditableText
            initialValue={g.label}
            callback={(label) => relabelGroup(label, g._id)}
          />
        </Stack>
        
        <Deleter callback={() => dispatch(removeGroup({
          oid: g._id,
          uid: graph_item?.uid
        }))} color={color} />
        
      </Stack>
    </ListItem>
    {showColorPicker ? (
      <ColorPicker
        defaultColor={g.color}
        onChange={(color) => {
          dispatch(recolorGroup({color: color, group_id: g._id}));
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

import { useAppSelector } from "@/lib/hooks";
import randomColor from "randomcolor";
import ButtonActions from "@/components/ButtonActions";
import {
  SaveXLSXAction,
  SaveDocxAction,
  CopyJsonAction,
  CopyTextAction,
} from "@/components/Groups/GroupsActions";
import { NewItemForm } from "@/components/NewItemForm";
import { onDragStart } from "@/lib/drag";
import Deleter from "@/components/Deleter";
import { useAppDispatch } from "@/lib/hooks";
import { addGroup, recolorGroup, relabelGroup, removeGroup } from "@/actions/appState";
import { useSWRF } from "@/lib/swr";
import WindowDefinitions from "../WindowFolder/WindowDefinitions";
import { Groups } from "@/types/groups";

export default function Groups(props) {
  const dispatch = useAppDispatch()
  const { _id: workspace_id } = useAppSelector((state) => state.appState.workspace);
  const { _id: workflow_id, settings } = useAppSelector((state) => state.appState.workflow);
  const { data: groups, isLoading } = useSWRF(workspace_id ? `/api/groups?workspace=${workspace_id}` : null);  

  const fetchgroups = async () => {
    const out = [];
    for (const group of groups) {
      const g = group;
      g["docs"] = [];
      for (const doc of g.docs) {
        const response = await fetch(
          `/api/document?document=${doc}`
        ).then((res) => res.json());
        g["docs"].push(response);
      }
      out.push(g);
    }
    return out;
  };

  if (isLoading) {
    return <>Loading groups...</>
  }

  const handleAddGroup = (e) => {
    const newGroup: Groups = {
      label: e.target.value,
      color: randomColor(),
      docs: [],
      workspace: workspace_id
    }
    dispatch(addGroup(newGroup))
  }

  
  return (
    <div style={{ overflow: "auto", height: "100%" }}>

      <NewItemForm 
        label={"Create new group..."} 
        HandleSubmit={handleAddGroup}
      />

      <Divider />

      <ButtonActions
        inner={[
          [SaveXLSXAction, { fetchgroups, workflow_id }],
          [SaveDocxAction, { fetchgroups, workflow_id }],
          [CopyJsonAction, { fetchgroups }],
          [CopyTextAction, { fetchgroups }],
          // [ClusterButtonAction, { runClusters }],
        ]}
      />

      <GroupList
        groups={groups}
        removeGroup={(params) => dispatch(removeGroup(params))}
        relabelGroup={(label, id) => dispatch(relabelGroup({label: label, group_id: id}))}
        color={settings.color}
      />
    </div>
  );
}
