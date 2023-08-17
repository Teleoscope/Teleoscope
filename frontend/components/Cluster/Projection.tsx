// Projections.tsx
import React, { useState } from "react";

// mui
import LoadingButton from "@mui/lab/LoadingButton";

// util
import { useSWRHook } from "@/util/swr";
import DocumentList from "@/components/Documents/DocumentList";
import ButtonActions from "../ButtonActions";
import { Tooltip, Typography } from "@mui/material";
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
  const [alignment, setAlignment] = React.useState<boolean | null>(false);

  const handleAlignment = (
    event: React.MouseEvent<HTMLElement>,
    newAlignment: boolean | null,
  ) => {
    client.update_node(projection_id, {separation: newAlignment})
    setAlignment(newAlignment);
  };


  return (
    <ToggleButtonGroup
      value={alignment}
      exclusive
      size="small"
      onChange={handleAlignment}
      aria-label="text alignment"
      sx={{margin: "0.25em"}}
    >
      <Tooltip title="Expand groups">
      <ToggleButton value={true} aria-label="expand">
        <BsArrowsExpand />
      </ToggleButton>
      </Tooltip>
      <Tooltip title="Collapse groups">
      <ToggleButton value={false} aria-label="collapse">
        <BsArrowsCollapse />
      </ToggleButton>
      </Tooltip>
      
    </ToggleButtonGroup>
  );
}
const ToggleOrder = () => {
  //   "ordering": <either "average" or "random">,
  const [alignment, setAlignment] = React.useState<string | null>('average');

  const handleAlignment = (
    event: React.MouseEvent<HTMLElement>,
    newAlignment: string | null,
  ) => {
    client.update_node(projection_id, {ordering: newAlignment})
    setAlignment(newAlignment);
  };

  return (
    <ToggleButtonGroup
      value={alignment}
      exclusive
      size="small"
      onChange={handleAlignment}
      aria-label="text alignment"
      sx={{margin: "0.25em"}}
    >
      <Tooltip title="Randomize source documents">
      <ToggleButton value="random" aria-label="random">
        <FaDiceThree />
      </ToggleButton>
      </Tooltip>
      <Tooltip title="Sort source documents">
      <ToggleButton value="average" aria-label="average">
        <HiSortAscending />
      </ToggleButton>
      </Tooltip>
      
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
