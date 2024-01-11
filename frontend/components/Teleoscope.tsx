// Teleoscope.js
import { useState, useEffect } from "react";

// mui
import LoadingButton from "@mui/lab/LoadingButton";

// custom components
import DocumentList from "@/components/Documents/DocumentList";
import Count from "@/components/Count";

// util
import { useSWRHook } from "@/util/swr";
import { IconButton, Slider, Stack, Tooltip, Typography } from "@mui/material";
import ButtonActions from "@/components/ButtonActions";
import Histogram from "@/components/Histogram";
import { useStomp } from "@/util/Stomp";
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
import { useAppSelector } from "@/util/hooks";

// Custom tooltip component
function ValueLabelComponent(props) {
  const { children, value } = props;

  return (
    <Tooltip 
      placement="bottom"
      title={`${value}`}
    >
      {children}
    </Tooltip>
  );
}


const DistanceSlider = ({teleoscope, client, color}) => {
  const handleChange = (event, value) => {
    client.update_node(teleoscope._id, {distance: value})
  };

  return <Slider
  slots={{
    valueLabel: ValueLabelComponent,
  }}
  style={{
    width: "25%"
  }}
  aria-label="Distance"
  defaultValue={teleoscope["parameters"]["distance"] ? teleoscope["parameters"]["distance"] : "0.4"}
  valueLabelDisplay="auto"
  step={0.1}
  size="small"
  min={0.1}
  max={1.5}
  sx={{ color: color }}
  onChangeCommitted={(event, value) =>
    handleChange(event, value)
  }
/>
}

const SimilaritySlider = ({teleoscope, client, color}) => {
  const handleChange = (event, value) => {
    client.update_node(teleoscope._id, {similarity: value})
  };

  return <Slider
  slots={{
    valueLabel: ValueLabelComponent,
  }}
  style={{
    width: "25%"
  }}
  aria-label="Similarity"
  defaultValue={teleoscope["parameters"]["similarity"] ? teleoscope["parameters"]["similarity"] : "0.4"}
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


export default function Teleoscope(props) {
  const debug = false;
  const [teleoscope_id] = useState(props.id.split("%")[0]);
  const swr = useSWRHook();
  const client = useStomp();

     // Time before render
     const startTime = performance.now();

     useEffect(() => {
         // Time after render
         const endTime = performance.now();
 
         // Calculate and log the render time
         console.log(`Render time: ${endTime - startTime} milliseconds`);
     });

  const color = useAppSelector((state) => state.windows.settings.color);
  const { teleoscope } = props.windata?.demo
    ? props.windata.demodata
    : swr.useSWRAbstract("teleoscope", `graph/${teleoscope_id}`);

  const doclists = teleoscope?.doclists;


  const Status = (teleoscope) => {
    if (teleoscope) {
     if (teleoscope.doclists.length > 0) {
       return (
        <Stack direction="row" sx={{ width: "100%" }} spacing={2} alignItems="center" justifyContent="center">
          <Count loading={teleoscope ? false : true} count={teleoscope.doclists.reduce((a, d) => a + d.ranked_documents.length, 0)} /> 
          <Histogram data={teleoscope.doclists[0].ranked_documents}></Histogram>
          <DistanceSlider color={color} teleoscope={teleoscope} client={client} />
          
        </Stack>
        )
     }
     else if (teleoscope.edges.control.length > 0) {
       return <Stack direction="row" sx={{ width: "100%" }} spacing={2} alignItems="center" justifyContent="center">
          <Typography sx={{ width: "100%" }} align="center" variant="caption">{teleoscope.status}</Typography>
       </Stack>
     }
     else {
      return <DistanceSlider color={color} teleoscope={teleoscope} client={client} />
     }



    }
    
    return null
   }


   const CopyToGroup = (teleoscope) => {
      return (
      <Tooltip title="Copy Doclists to Groups" key="Copy Doclists to Groups">
      <IconButton onClick={() => client.copy_doclists_to_groups(teleoscope._id)}>
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
