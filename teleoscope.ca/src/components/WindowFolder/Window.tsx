// custom
import WindowTopBar from "@/components/WindowFolder/WindowTopBar";

// mui
import { Chip, Stack, Paper, Box, Divider } from "@mui/material";

// actions
import { useDispatch } from "react-redux";
import { maximizeWindow, updateNodes } from "@/actions/appState";

export default function Window({icon, title, inner, color, reactflow_node}) {
  const dispatch = useDispatch();

  const handleDelete = () => {
    dispatch(updateNodes({
      changes: [
        {
          id: reactflow_node.id,
          type: "remove"
        }
      ]
  }))
  };


  if (reactflow_node.width < reactflow_node.minWidth + 1 || reactflow_node.height < reactflow_node.minHeight + 1) {
    return (
      <Chip
        label={
          <Box 
            sx={{ 
              display: 'flex', 
              flexShrink: 2, 
              width: reactflow_node.width,
              paddingLeft: "2px"
            }}
          >{title}
          </Box>
        }
        // variant="filled"
        avatar={<span style={{width: "1em", padding: "0.425em"}}>{icon}</span>}
        onDoubleClick={() => {
          dispatch(maximizeWindow({ id: reactflow_node.id }))
        }}
        onDelete={handleDelete}
        sx={{
          border: reactflow_node?.isChecked
            ? `2px solid ${color}`
            : "1px solid #DDDDDD",
          boxShadow: "1",
          cursor: "move",
          
          backgroundColor: "white",
          [`& .MuiChip-icon`]: {
            color: color,
            // fontSize: "1.5em",
            // marginLeft: "1em",
          },
        }}
      />
    );
  }

  return (
    <Paper
      variant="outlined"
      style={{
        height: reactflow_node.height,
        width: reactflow_node.width,
        overflow: "hidden",
      }}
      sx={{
        boxShadow: "1",
      }}
    >
      <Stack
        style={{
          height: reactflow_node.height - 2,
          width: reactflow_node.width - 2,
        }}
      >
        <WindowTopBar
          title={title}
          reactflow_node_id={reactflow_node.id}
          icon={icon}
        />
        <Divider />
        <Box
          className="nodrag nowheel"
          sx={{
            flexGrow: 1,
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {inner}
        </Box>
      </Stack>
    </Paper>
  );
}
