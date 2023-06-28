import React, { useState, useContext } from "react";

import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { useSWRHook } from "@/util/swr";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import FolderIcon from "@mui/icons-material/Folder";
import { useStomp } from "@/components/Stomp";
import { IconButton, Tooltip } from "@mui/material";
import {
  Delete as DeleteIcon,
  Diversity2 as Diversity2Icon,
} from "@mui/icons-material";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import { onDragStart } from "@/util/drag";
import { setSelection } from "@/actions/windows";


export default function Clusters(props) {
  const p_id = props.data;
  const session_id = useAppSelector((state) => state.activeSessionID.value);
  const settings = useAppSelector((state) => state.windows.settings);
 
  const swr = useSWRHook();
  const client = useStomp();
  const dispatch = useAppDispatch();

  const { clusters } = swr.useSWRAbstract("clusters", `projections/${p_id}/clusters`);
  const { groups } = swr.useSWRAbstract("groups", `sessions/${session_id}/groups`);

  const [highlightedItem, setHighlightedItem] = useState(null);
  
  const handleItemClick = (c_id) => {
    setHighlightedItem(c_id);
    dispatch(
      setSelection({
        nodes: [{ id: c_id, data: { type: "Cluster" } }],
        edges: [],
      })
    );
  };

  // TODO - cluster on flow inputs not all groups. 
  const runClusters = () => {
    client.cluster_by_groups(
      groups.map((g) => g._id),
      p_id,
      session_id
    );
  };

  const removeCluster = (c_id) => {client.remove_cluster(c_id, p_id)}

  return (
    <>
      <>
        <Stack
          direction="row"
          justifyContent="center"
          alignItems="center"
          style={{ margin: 0 }}
        >
          <Tooltip title="Cluster on existing groups...">
          <IconButton onClick={runClusters}>
            <Diversity2Icon fontSize="small" />
          </IconButton>
          </Tooltip>
        </Stack>
        <Divider />
      </>
      <div style={{ overflow: "auto", height: "100%" }}>
        {clusters?.length !== 0 ? (
          <List>
            {clusters?.map((cluster) => {
              const isHighlighted = cluster._id === highlightedItem;
              return (
                <div
                  key={cluster._id}
                  style={{
                    overflow: "auto",
                    position: "relative",
                    borderBottom: "1px solid  #eceeee",
                    paddingTop: "2px",
                    paddingBottom: "3px",
                    width: "100%",
                    height: "100%",
                    backgroundColor: isHighlighted ? "#EEEEEE" : "white",
                  }}
                  draggable={true}
                  onDragStart={(e) => onDragStart(e, cluster._id, "Cluster")}
                  onClick={() => handleItemClick(cluster._id)}
                  >
                  <Stack
                    sx={{ width: "100%", }}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <ListItem>
                      <ListItemIcon>
                        <FolderIcon sx={{ color: cluster.history[0].color }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={cluster.history[0].label}
                        secondary={cluster.history[0].description}
                      />
                    </ListItem>
                    <IconButton onClick={() => removeCluster(cluster._id)}>
                      <DeleteIcon
                        sx={[{"&:hover": {color: settings.color}}]}
                      ></DeleteIcon>
                    </IconButton>
                  </Stack>
                </div>
              );
            })}
          </List>
        ) : (
          <p>Use button above to build clusters...</p>
        )}
      </div>
    </>
  );
}