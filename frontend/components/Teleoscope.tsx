// Teleoscope.js
import { useState } from "react";

// mui
import LoadingButton from "@mui/lab/LoadingButton";

// custom components
import DocumentList from "@/components/Documents/DocumentList";

// util
import { useSWRHook } from "@/util/swr";
import { IconButton, Stack, Tooltip, Typography } from "@mui/material";
import ButtonActions from "@/components/ButtonActions";
import Histogram from "@/components/Histogram";
import { useStomp } from "@/util/Stomp";
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
export default function Teleoscope(props) {
  const [teleoscope_id] = useState(props.id.split("%")[0]);
  const swr = useSWRHook();
  


  const { teleoscope } = props.windata?.demo
    ? props.windata.demodata
    : swr.useSWRAbstract("teleoscope", `graph/${teleoscope_id}`);

  const doclists = teleoscope?.doclists;
  const Status = (teleoscope) => {
    if (teleoscope) {
     if (teleoscope.doclists.length > 0) {
       return (
        <Stack direction="row" sx={{ width: "100%" }} spacing={2} alignItems="center" justifyContent="center">
          <Typography  align="center" variant="caption">
            Number of results: {teleoscope.doclists.reduce((a, d) => a + d.ranked_documents.length, 0)}
          </Typography>
          <Histogram data={teleoscope.doclists[0].ranked_documents}></Histogram>
        </Stack>
        )
     }
     if (teleoscope.edges.control.length > 0) {
       return  <Typography sx={{ width: "100%" }} align="center" variant="caption">
         {teleoscope.status}</Typography>
     }
    }
    
    return null
   }


   const CopyToGroup = (teleoscope) => {
      const client = useStomp();
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
        <DocumentList data={doclists} pagination={true}></DocumentList>
      ) : (
        <LoadingButton loading={true} />
      )}
    </>
  );
}
