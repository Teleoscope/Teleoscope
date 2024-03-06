import { useState } from "react";
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { useSWRHook } from "@/util/swr";
import { List, ListItem, ListItemText, ListItemIcon, Stack } from "@mui/material"; // Combined @mui/material imports
import FolderIcon from "@mui/icons-material/Folder";
import LoadingButton from "@mui/lab/LoadingButton";
import { useStomp } from "@/util/Stomp";
import { onDragStart } from "@/util/drag";
import { setSelection } from "@/actions/windows";
import Deleter from "@/components/Deleter";

export default function Clusters({ data: p_id }) {
  // Use Redux hooks for state management
  const session_id = useAppSelector(state => state.activeSessionID.value);
  const settings = useAppSelector(state => state.windows.settings);
  const dispatch = useAppDispatch();

  // Initialize custom hooks for data fetching and WebSocket communication
  const swr = useSWRHook();
  const client = useStomp();

  // Fetch clusters and groups data
  const { clusters } = swr.useSWRAbstract("clusters", `projections/${p_id}/clusters`);
  const { groups } = swr.useSWRAbstract("groups", `sessions/${session_id}/groups`);

  // Local state for UI control
  const [highlightedItem, setHighlightedItem] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle cluster item click, highlighting the item and dispatching selection
  const handleItemClick = c_id => {
    setHighlightedItem(c_id);
    dispatch(setSelection({ nodes: [{ id: c_id, data: { type: "Cluster" } }], edges: [] }));
  };

  // Render loading button if loading, otherwise render cluster list
  return loading ? (
    <Stack justifyContent="center" sx={{ margin: 0, paddingTop: "5px" }}>
      <LoadingButton loading />
    </Stack>
  ) : (
    <div style={{ overflow: "auto", height: "100%" }}>
      <List>
        {clusters?.map(cluster => {
          const isHighlighted = cluster._id === highlightedItem;
          return (
            <div
              key={cluster._id}
              draggable
              onDragStart={e => onDragStart(e, cluster._id, "Group")}
              onClick={() => handleItemClick(cluster._id)}
              style={{
                overflow: "auto",
                position: "relative",
                borderBottom: "1px solid #eceeee",
                paddingTop: "2px",
                paddingBottom: "3px",
                width: "100%",
                height: "100%",
                backgroundColor: isHighlighted ? "#EEEEEE" : "white",
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <ListItem>
                  <ListItemIcon>
                    <FolderIcon sx={{ color: cluster.history[0].color }} />
                  </ListItemIcon>
                  <ListItemText primary={cluster.history[0].label} secondary={cluster.history[0].description} />
                </ListItem>
                <Deleter callback={() => client.remove_cluster(cluster._id, p_id)} color={settings.color} />
              </Stack>
            </div>
          );
        })}
      </List>
    </div>
  );
}
