// rank.js
import { useState } from "react";

// mui
import LoadingButton from "@mui/lab/LoadingButton";

// custom components
import DocumentList from "@/components/Documents/DocumentList";
import Count from "@/components/Count";


import { IconButton, Slider, Stack, Tooltip, Typography } from "@mui/material";
import ButtonActions from "@/components/ButtonActions";
import Histogram from "@/components/Histogram";
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { copyDoclistsToGroups, updateNode } from "@/actions/appState";
import { useSWRF } from "@/lib/swr";

// Custom tooltip component
function ValueLabelComponent({ children, value }) {

  return (
    <Tooltip 
      placement="bottom"
      title={`${value}`}
    >
      {children}
    </Tooltip>
  );
}


const DistanceSlider = ({rank, color}) => {
  const dispatch = useAppDispatch()
  const handleChange = (event, value) => dispatch(updateNode({
    node_id: rank._id,
    parameters: {distance: value},
  }))
  
  return <Slider
  slots={{
    valueLabel: ValueLabelComponent,
  }}
  style={{
    width: "25%"
  }}
  aria-label="Distance"
  defaultValue={rank["parameters"]["distance"] ? rank["parameters"]["distance"] : "0.1"}
  valueLabelDisplay="auto"
  step={0.1}
  size="small"
  min={0.1}
  max={1}
  sx={{ color: color }}
  onChangeCommitted={(event, value) =>
    handleChange(event, value)
  }
/>
}

export default function Rank({ id, windata }) {
  const debug = false;
  const [rank_id] = useState(id);
  

  const color = useAppSelector((state) => state.appState.workflow.settings.color);
  const { data: rank, isLoading, error } = useSWRF(`/api/graph?uid=${rank_id}`);

  if (isLoading) {
    return <>Loading...</>
  }

  if (error) {
    return  <>Error...</>
  }

  const doclists = rank?.doclists;


  const Status = (rank) => {
    if (rank) {
     if (rank.doclists.length > 0) {
       return (
        <Stack direction="row" sx={{ width: "100%" }} spacing={2} alignItems="center" justifyContent="center">
          <Count label="Number of results" loading={rank ? false : true} count={rank.doclists.reduce((a, d) => a + d.ranked_documents.length, 0)} /> 
          <Histogram data={rank.doclists[0].ranked_documents}></Histogram>
          <DistanceSlider color={color} rank={rank} />
          
        </Stack>
        )
     }
     else if (rank.edges.control.length > 0) {
       return <Stack direction="row" sx={{ width: "100%" }} spacing={2} alignItems="center" justifyContent="center">
          <Typography sx={{ width: "100%" }} align="center" variant="caption">{rank.status}</Typography>
       </Stack>
     }
     else {
      return <DistanceSlider color={color} rank={rank} />
     }



    }
    
    return null
   }
  
   const CopyToGroup = (rank) => {
    const dispatch = useAppDispatch();
      return (
      <Tooltip title="Copy Doclists to Groups" key="Copy Doclists to Groups">
      <IconButton onClick={() => dispatch(copyDoclistsToGroups({node_id: rank._id}))}>
        <FolderCopyIcon fontSize="small" />
      </IconButton>
    </Tooltip>)
   }

 
  return (
    <><ButtonActions inner={[[Status, rank], [CopyToGroup, rank]]}></ButtonActions>
      {rank ? (
        <>{debug ? <p>{rank._id}</p> : <></>}
        <DocumentList data={doclists} pagination={true}></DocumentList></>
      ) : (
        <LoadingButton loading={true} />
      )}
    </>
  );
}
