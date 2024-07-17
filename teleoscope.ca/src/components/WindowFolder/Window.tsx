// custom
import WindowTopBar from "@/components/WindowFolder/WindowTopBar";

// mui
import { Chip, Stack, Paper, Box, Divider } from "@mui/material";

// actions
import { useDispatch } from "react-redux";
import { maximizeWindow, updateNodes } from "@/actions/appState";
import { useEffect, useRef, useState } from "react";

export default function Window({windata, id, size, title, icon, inner, color}) {
  const w = windata;
  const dispatch = useDispatch();

  const handleDelete = () => {
    dispatch(updateNodes({
      changes: [
        {
          id: id,
          type: "remove"
        }
      ]
  }))
  };

  const elRef = useRef();
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!elRef?.current?.clientHeight) {
      return;
    }
    setHeight(elRef?.current?.clientHeight);
  }, [elRef?.current?.clientHeight]);

  if (size.width < size.minWidth + 1 || size.height < size.minHeight + 1) {
    return (
      <Chip
        label={
          <Box 
            sx={{ 
              display: 'flex', 
              flexShrink: 2, 
              width: size.width,
              paddingLeft: "2px"
            }}
          >{title}
          </Box>
        }
        // variant="filled"
        avatar={<span style={{width: "1em", padding: "0.425em"}}>{icon}</span>}
        onDoubleClick={() => {
          dispatch(maximizeWindow({ id: id }))
        }}
        onDelete={handleDelete}
        sx={{
          border: w?.isChecked
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
        height: size.height,
        width: size.width,
        overflow: "hidden",
      }}
      sx={{
        boxShadow: "1",
      }}
    >
      <Stack
        style={{
          height: size.height - 2,
          width: size.width - 2,
        }}
      >
        <WindowTopBar
          title={title}
          id={id}
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
