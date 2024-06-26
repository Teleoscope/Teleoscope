// Teleoscope.js
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


const DistanceSlider = ({teleoscope, color}) => {
  const dispatch = useAppDispatch()
  const handleChange = (event, value) => dispatch(updateNode({
    node_id: teleoscope._id,
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
  defaultValue={teleoscope["parameters"]["distance"] ? teleoscope["parameters"]["distance"] : "0.1"}
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

export default function Teleoscope({ id, windata }) {
  const debug = false;
  const [teleoscope_id] = useState(id.split("%")[0]);
  

  const color = useAppSelector((state) => state.appState.workflow.settings.color);
  const { data: teleoscope } = useSWRF(`graph/${teleoscope_id}`);

  const doclists = teleoscope?.doclists;


  const Status = (teleoscope) => {
    if (teleoscope) {
     if (teleoscope.doclists.length > 0) {
       return (
        <Stack direction="row" sx={{ width: "100%" }} spacing={2} alignItems="center" justifyContent="center">
          <Count label="Number of results" loading={teleoscope ? false : true} count={teleoscope.doclists.reduce((a, d) => a + d.ranked_documents.length, 0)} /> 
          <Histogram data={teleoscope.doclists[0].ranked_documents}></Histogram>
          <DistanceSlider color={color} teleoscope={teleoscope} />
          
        </Stack>
        )
     }
     else if (teleoscope.edges.control.length > 0) {
       return <Stack direction="row" sx={{ width: "100%" }} spacing={2} alignItems="center" justifyContent="center">
          <Typography sx={{ width: "100%" }} align="center" variant="caption">{teleoscope.status}</Typography>
       </Stack>
     }
     else {
      return <DistanceSlider color={color} teleoscope={teleoscope} />
     }



    }
    
    return null
   }
  
   const CopyToGroup = (teleoscope) => {
    const dispatch = useAppDispatch();
      return (
      <Tooltip title="Copy Doclists to Groups" key="Copy Doclists to Groups">
      <IconButton onClick={() => dispatch(copyDoclistsToGroups({node_id: teleoscope._id}))}>
        <FolderCopyIcon fontSize="small" />
      </IconButton>
    </Tooltip>)
   }

 
  return (
    <><ButtonActions inner={[[Status, teleoscope], [CopyToGroup, teleoscope]]}></ButtonActions>
      {teleoscope ? (
        <>{debug ? <p>{teleoscope._id}</p> : <></>}
        <DocumentList data={doclists} pagination={true}></DocumentList></>
      ) : (
        <LoadingButton loading={true} />
      )}
    </>
  );
}
