// Projections.tsx
import React, { useState } from "react";

// mui
import LoadingButton from "@mui/lab/LoadingButton";

// util
import { useSWRHook } from "@/util/swr";
import DocumentList from "@/components/Documents/DocumentList";
import ButtonActions from "../ButtonActions";
import { Box, Tooltip, Typography } from "@mui/material";
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { BsArrowsCollapse } from "react-icons/bs";
import { BsArrowsExpand } from "react-icons/bs";

import { FaDiceThree } from "react-icons/fa";
import { HiSortAscending } from "react-icons/hi";
import { useStomp } from "@/util/Stomp";



export default function Projection(props) {
  const [projection_id] = useState(props.id.split("%")[0]);
  const swr = useSWRHook();
  const { projection } = swr.useSWRAbstract(
    "projection", 
    `graph/${projection_id}`
  );

  const client = useStomp();


  const doclists = projection?.doclists;

  const ToggleCollapse = () => {


  const updateValue = (
    event: React.MouseEvent<HTMLElement>,
    newValue: boolean | null,
  ) => {
    client.update_node(projection_id, {separation: newValue})
  };


  return (
    <ToggleButtonGroup
      value={projection?.parameters.separation}
      exclusive
      size="small"
      onChange={updateValue}
      aria-label="group separation"
      sx={{margin: "0.25em"}}
    >
      
      <ToggleButton value={true} aria-label="expand">
      <Tooltip title="Expand groups">
        <Box component="span" sx={{margin: 0, padding: 0}}>
        <BsArrowsExpand />
        </Box>
        </Tooltip>
      </ToggleButton>
      
      
      <ToggleButton value={false} aria-label="collapse">
      <Tooltip title="Collapse groups">
      <Box component="span" sx={{margin: 0, padding: 0}}>
        <BsArrowsCollapse />
        </Box>
        </Tooltip>
      </ToggleButton>
      
      
    </ToggleButtonGroup>
  );
}
const ToggleOrder = () => {
  //   "ordering": <either "average" or "random">,

  const updateValue = (
    event: React.MouseEvent<HTMLElement>,
    newValue: string | null,
  ) => {
    client.update_node(projection_id, {ordering: newValue})
  };

  return (
    <ToggleButtonGroup
      value={projection?.parameters.ordering}
      exclusive
      size="small"
      onChange={updateValue}
      aria-label="document ordering"
      sx={{margin: "0.25em"}}
    >
      
      <ToggleButton value="random" aria-label="random">
        <Tooltip title="Randomize source documents">
          <Box component="span" sx={{margin: 0, padding: 0}}>
            <FaDiceThree />
          </Box>
        </Tooltip>
      </ToggleButton>
      
      
      <ToggleButton value="average" aria-label="average">
      <Tooltip title="Sort source documents">
        <Box component="span" sx={{margin: 0, padding: 0}}>
        <HiSortAscending />
        </Box>
        </Tooltip>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
  const Status = (projection) => {
   if (projection) {
    if (projection.doclists.length > 0) {
      return <Typography sx={{ width: "100%" }} align="center" variant="caption">
        Number of clusters: {projection.doclists.length}</Typography>
    }
    if (projection.edges.control.length > 0) {
      return  <Typography sx={{ width: "100%" }} align="center" variant="caption">
        {projection.status}</Typography>
    }
   }
   
   return null
  }


  
  return (

    <>
    <ButtonActions inner={[[ToggleCollapse, {}], [ToggleOrder, {}]]}></ButtonActions>
    <ButtonActions inner={[[Status, projection]]}></ButtonActions>
      {projection ? (
        <DocumentList data={doclists} pagination={true}></DocumentList>
      ) : (
        <LoadingButton loading={true} />
      )}
    </>
  );
}
