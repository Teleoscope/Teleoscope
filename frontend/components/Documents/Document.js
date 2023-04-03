// Window.js
import React from "react";

// custom
import DocumentText from "./DocumentText";
import GroupSelector from "../GroupSelector";

// mui
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import LinkIcon from "@mui/icons-material/Link";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
//utils
import useSWRAbstract from "../../util/swr";
import { PreprocessText } from "../../util/Preprocessers";
import ButtonActions from "../ButtonActions";
import Tooltip from "@mui/material/Tooltip";


export default function Document(props) {
  const id = props.id.split("%")[0];
  const { document } = useSWRAbstract("document", `/api/document/${id}`);
  const text = document ? PreprocessText(document.text) : false;

  const handleLinkClick = () => {
    console.log("click");
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

  const copyToClipboard = () => navigator.clipboard.writeText(`${document.title} \n ${document.text}`)

  const CopyText = () => {
    return (
      <Tooltip title="Copy text to clipboard">
        <IconButton onClick={copyToClipboard}>
          <ContentCopyIcon fontSize="small" />
        </IconButton>
        </Tooltip> 
    )
  }

  return (
    <div style={{ overflow: "auto", height: "100%", marginTop: "0em" }}>
      <ButtonActions inner={[CopyText, Link, Group]}></ButtonActions>
      <DocumentText text={text} />
      <Divider sx={{ margin: 5 }} />
    </div>
  );
}
