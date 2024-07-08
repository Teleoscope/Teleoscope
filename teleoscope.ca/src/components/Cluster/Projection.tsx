// Import necessary libraries and components
import { useState } from "react";
import { Box, Tooltip, Typography, ToggleButton, ToggleButtonGroup } from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import { BsArrowsCollapse, BsArrowsExpand } from "react-icons/bs";
import { FaDiceThree } from "react-icons/fa";
import { HiSortAscending } from "react-icons/hi";
import DocumentList from "@/components/Documents/DocumentList";
import ButtonActions from "../ButtonActions";
import { useAppDispatch } from "@/lib/hooks";
import { updateNode } from "@/actions/appState";
import { useSWRF } from "@/lib/swr";


// Main Projection component
export default function Projection({ id }) {
  // Extract projection ID from props and initialize state and hooks
  const projectionId = useState(id.split("%")[0])[0];
  
  const dispatch = useAppDispatch()

  // Use SWR hook for data fetching
  const { data: projection, isLoading, error } = useSWRF(`/api/graph/${projectionId}`);
  
  if (isLoading) {
    return <>Loading...</>
  }

  if (error) {
    return  <>Error...</>
  }

  // Toggle group separation state and update backend
  const ToggleCollapse = () => {
    const updateValue = (event, newValue) => dispatch(updateNode({
        node_id: projectionId,
        parameters: { separation: newValue },
    }));

    return (
      <ToggleButtonGroup
        value={projection?.parameters.separation}
        exclusive
        size="small"
        onChange={updateValue}
        aria-label="group separation"
        sx={{ margin: "0.25em" }}
      >
        <ToggleButton value={true} aria-label="expand">
          <Tooltip title="Attempt to separate groups">
            <Box component="span" sx={{ margin: 0, padding: 0 }}>
              <BsArrowsExpand />
            </Box>
          </Tooltip>
        </ToggleButton>
        <ToggleButton value={false} aria-label="collapse">
          <Tooltip title="Allow groups to merge">
            <Box component="span" sx={{ margin: 0, padding: 0 }}>
              <BsArrowsCollapse />
            </Box>
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>
    );
  };

  // Toggle document ordering and update backend
  const ToggleOrder = () => {
    const updateValue = (event, newValue) => dispatch(updateNode({
      node_id: projectionId,
      parameters:  { ordering: newValue },
  }));
    
  
    return (
      <ToggleButtonGroup
        value={projection?.parameters.ordering}
        exclusive
        size="small"
        onChange={updateValue}
        aria-label="document ordering"
        sx={{ margin: "0.25em" }}
      >
        <ToggleButton value="random" aria-label="random">
          <Tooltip title="Randomize source documents">
            <Box component="span" sx={{ margin: 0, padding: 0 }}>
              <FaDiceThree />
            </Box>
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="average" aria-label="average">
          <Tooltip title="Sort source documents">
            <Box component="span" sx={{ margin: 0, padding: 0 }}>
              <HiSortAscending />
            </Box>
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>
    );
  };

  // Component to display projection status
  const Status = (projection) => {
    if (projection?.doclists?.length > 0) {
      return (
        <Typography sx={{ width: "100%" }} align="center" variant="caption">
          Number of clusters: {projection.doclists.length}
        </Typography>
      );
    } else if (projection?.edges?.control?.length > 0) {
      return (
        <Typography sx={{ width: "100%" }} align="center" variant="caption">
          {projection.status}
        </Typography>
      );
    }
    return null;
  };

  // Main component render
  return (
    <>
      <ButtonActions inner={[[ToggleCollapse, {}], [ToggleOrder, {}]]} />
      <ButtonActions inner={[[Status, projection]]} />
      {projection ? (
        <DocumentList data={projection.doclists} pagination={true} />
      ) : (
        <LoadingButton loading />
      )}
    </>
  );
}
