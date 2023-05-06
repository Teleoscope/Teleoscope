import React, { useContext } from 'react';

// mui
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CopyAllIcon from '@mui/icons-material/CopyAll';
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

import IconButton from "@mui/material/IconButton";
// custom
import DocumentList from "./Documents/DocumentList"

//utils
import { swrContext } from "@/util/swr"
import ButtonActions from './ButtonActions';

export default function Group(props) {
  const id = props.id.split("%")[0];
  const swr = useContext(swrContext);
  const { group } = props.windata.demo ? props.windata.demodata : swr.useSWRAbstract("group", `groups/${id}`);
  const data = group?.history[0].included_documents.map((p) => { return [p, 1.0] });

  const fetchdocs = async () => {
    var docs = []    
    for (const [pid, s] of data) {
      const response = await fetch(`/api/${swr.subdomain}/document/${pid}`).then(res => res.json())
      docs = docs.concat([response])
    }
    return docs;
  }

  const copyTextToClipboard = async () => {
    const docs = await fetchdocs()
    var output = docs.map(({title, text}) => {
      return `${title}\n${text}\n\n`
    }).reduce((acc, curr) => acc + curr, `${group?.history[0].label}\n`)

    navigator.clipboard.writeText(output);
  }
  const copyJsonToClipboard = async () => {
    const docs = await fetchdocs()
    navigator.clipboard.writeText( JSON.stringify(docs, null, 2))
  }

  const CopyText = () => {
    return (
      <Tooltip title="Copy text to clipboard" key="Copy text to clipboard">
        <IconButton onClick={copyTextToClipboard}>
          <ContentCopyIcon fontSize="small" />
        </IconButton>
        </Tooltip> 
    )
  }

  const CopyJson = () => {
    return (
      <Tooltip title="Copy metadata to clipboard" key="Copy metadata to clipboard">
        <IconButton onClick={copyJsonToClipboard}>
          <CopyAllIcon fontSize="small" />
        </IconButton>
        </Tooltip> 
    )
  }
  return (
    <Stack direction="column" sx={{ height: "100%" }}>

    <Box sx={{ flexGrow: 1, flexDirection: "column", margin: "2px"}}>
    <ButtonActions inner={[CopyJson, CopyText ]}></ButtonActions>
      <DocumentList 
        data={data} 
        pagination={true} 
        showGroupIcon={false} 
        showOrientIcon={false}
        showRemoveIcon={false}
        group={group}
        ShowDeleteIcon={true}
      ></DocumentList>
      </Box>
      </Stack>

  );
}