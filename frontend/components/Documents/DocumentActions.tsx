import LinkIcon from "@mui/icons-material/Link";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CopyAllIcon from "@mui/icons-material/CopyAll";
import DownloadIcon from "@mui/icons-material/Download";
import Tooltip from "@mui/material/Tooltip";
import GroupSelector from "@/components/GroupSelector";
import { MakeDocx } from "@/components/DocxMaker";
import { Stack, IconButton } from "@mui/material";

export const handleLinkClick = (props) => {
  if (props.document.metadata.url) {
    window.open(props.document.metadata.url, "_blank");
  }
};

export const Link = (props) => {
  return (
    <Tooltip title="Open URL in new window">
      <IconButton onClick={() => handleLinkClick(props.document)}>
        <LinkIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

export const copyTextToClipboard = (document) =>
  navigator.clipboard.writeText(`${document.title} \n ${document.text}`);

export const copyJsonToClipboard = (document) =>
  navigator.clipboard.writeText(JSON.stringify(document, null, 2));

export const CopyText = (props) => {
  return (
    <Tooltip title="Copy text to clipboard" key="Copy text to clipboard">
      <IconButton onClick={() => copyTextToClipboard(document)}>
        <ContentCopyIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

export const CopyJson = (props) => {
  return (
    <Tooltip
      title="Copy metadata to clipboard"
      key="Copy metadata to clipboard"
    >
      <IconButton onClick={() => copyJsonToClipboard(props.document)}>
        <CopyAllIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

export const Group = (props) => <GroupSelector id={props.document?._id} />;

export const SaveDocx = (props) => {
  return (
    <Tooltip title="Download as Docx" key="Download as Docx">
      <IconButton
        onClick={() =>
          MakeDocx({
            tag: "Document",
            title: props.document.title,
            groups: [
              {
                label: "Single document",
                documents: [props.document],
              },
            ],
          })
        }
      >
        <DownloadIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};
