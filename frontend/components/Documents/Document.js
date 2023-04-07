// Window.js
import React, { useContext } from "react";

// custom
import DocumentText from "./DocumentText";
import GroupSelector from "../GroupSelector";

// mui
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import LinkIcon from "@mui/icons-material/Link";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CopyAllIcon from '@mui/icons-material/CopyAll';
import Tooltip from "@mui/material/Tooltip";

//utils
import { swrContext } from "@/util/swr";
import { PreprocessText } from "@/util/Preprocessers";
import ButtonActions from "../ButtonActions";


export default function Document(props) {
  const id = props.id.split("%")[0];
  const swr = useContext(swrContext);
  const { document } = swr.useSWRAbstract("document", `document/${id}`);
  const text = document ? PreprocessText(document.text) : false;

  const handleLinkClick = () => {
    if (document.metadata.url) {
      window.open(document.metadata.url, "_blank");
    }
  };

  const Link = () => {
    return (
      <Tooltip title="Open URL in new window">
        <IconButton onClick={handleLinkClick}>
          <LinkIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );
  };

  const Group = () => <GroupSelector id={id} />;

  const copyTextToClipboard = () => navigator.clipboard.writeText(`${document.title} \n ${document.text}`)
  const copyJsonToClipboard = () => navigator.clipboard.writeText( JSON.stringify(document, null, 2))

  const CopyText = () => {
    return (
      <Tooltip title="Copy text to clipboard">
        <IconButton onClick={copyTextToClipboard}>
          <ContentCopyIcon fontSize="small" />
        </IconButton>
        </Tooltip> 
    )
  }

  const CopyJson = () => {
    return (
      <Tooltip title="Copy metadata to clipboard">
        <IconButton onClick={copyJsonToClipboard}>
          <CopyAllIcon fontSize="small" />
        </IconButton>
        </Tooltip> 
    )
  }

  return (
    <div style={{ overflow: "auto", height: "100%", marginTop: "0em" }}>
      <ButtonActions inner={[CopyJson, CopyText, Link, Group]}></ButtonActions>
      <DocumentText text={text} />
      <Divider sx={{ margin: 5 }} />
    </div>
  );
}
