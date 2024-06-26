import { Box, Stack, Typography } from "@mui/material";
import DemoProviders from "./DemoProviders";
import ExampleFlow from "./DemoFlow";
import SelectionViewer from "../Sidebar/SelectionViewer";

const searchNode = {
    id: "%search",
    type: "windowNode",
    position: {
      x: 25,
      y: 25,
    },
    style: {
      width: 300,
      height: 300,
    },
    data: {
      label: "%search node",
      i: "%search",
      type: "Search",
    },
    width: 300,
    height: 300,
    selected: false,
    positionAbsolute: {
      x: 0,
      y: 0,
    },
    dragging: false,
    draggable: false,
    // selectable: fa
  };

  export default function SearchDemo() {
    return (
        <DemoProviders>
        <Stack direction="row">
          <ExampleFlow
            label="Search"
            width="48%"
            nodes={nodes}
            edges={[]}
            panOnDrag={false}
            zoomOnScroll={false}
          ></ExampleFlow>
          <Box sx={{ flexGrow: 1, flexDirection: "row" }}></Box>

          <Stack sx={{ width: "48%", height: exampleHeight }}>
            <Typography variant="overline" display="block" gutterBottom>
              Document reader
            </Typography>
            <Box
              sx={{
                marginTop: "10px",
                height: "100%",
                border: "1px solid #D3D3D3",
                overflow: "auto",
              }}
            >
              <SelectionViewer
                noGroup={true}
                noTeleoscope={true}
              ></SelectionViewer>
            </Box>
          </Stack>
        </Stack>
      </DemoProviders>
    )
  }