import { useContext } from "react";

import { useAppSelector } from "@/util/hooks";
import { RootState } from "@/stores/store";
import { swrContext } from "@/util/swr";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import FolderIcon from "@mui/icons-material/Folder";
import { StompContext } from "@/components/Stomp";
import { IconButton, Tooltip } from "@mui/material";
import {
  Download as DownloadIcon,
  ContentCopy as ContentCopyIcon,
  CopyAll as CopyAllIcon,
  Diversity2 as Diversity2Icon,
} from "@mui/icons-material";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";



export default function Clusters(props) {
  const p_id = props.data;
  const session_id = useAppSelector((state) => state.activeSessionID.value);
  const userid = useAppSelector((state) => state.activeSessionID.userid);

  const swr = useContext(swrContext);
  const client = useContext(StompContext);

  const { clusters } = swr.useSWRAbstract(
    "clusters",
    `projections/${p_id}/clusters`
  );

  const { groups } = swr.useSWRAbstract("groups", `sessions/${session_id}/groups`);

  const onDragStart = (event, id, type, typetag) => {
    event.dataTransfer.setData("application/reactflow/type", type);
    event.dataTransfer.setData("application/reactflow/id", `${id}%${typetag}`);
    event.dataTransfer.effectAllowed = "move";
  };

  const runClusters = () => {
    client.cluster_by_groups(
      groups.map((g) => g._id),
      p_id,
      session_id
    );
  };

  return (
    <>
      <>
        <Stack
          direction="row"
          justifyContent="center"
          alignItems="center"
          style={{ margin: 0 }}
        >
          <Tooltip title="Cluster on exisitng groups...">
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
              return (
                <div
                  key={cluster._id}
                  style={{ overflow: "auto", height: "100%" }}
                  draggable={true}
                  onDragStart={(e) =>
                    onDragStart(
                      e, 
                      cluster._id + "%cluster", 
                      "Cluster", 
                      "cluster"
                    )
                  }
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