import LinkIcon from "@mui/icons-material/Link";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CopyAllIcon from "@mui/icons-material/CopyAll";
import Tooltip from "@mui/material/Tooltip";
import GroupSelector from "@/components/Groups/GroupSelector";
import { MakeDocx } from "@/util/DocxMaker";
import { IconButton } from "@mui/material";
import ButtonActions from "../ButtonActions";
import { utils, writeFile } from "xlsx";
import { BsFiletypeXlsx } from "react-icons/bs";
import { BsFiletypeDocx } from "react-icons/bs";

export const handleLinkClick = ({ document }) => {
  if (document.metadata.url) {
    window.open(document.metadata.url, "_blank");
  }
  if (document.metadata.source_url) {
    window.open(document.metadata.source_url, "_blank");
  }
};

export const Link = (doc) => {
  return (
    <Tooltip title="Open URL in new window">
      <IconButton onClick={() => handleLinkClick(doc)}>
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
        <BsFiletypeDocx fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};


export const SaveXLSX = (props) => {
  return (
    <Tooltip title="Download as XLSX" key="Download as XLSX">
      <IconButton
        onClick={() => {
          const worksheet = utils.json_to_sheet([{...props.document, ...props.document.metadata}]);
          const workbook = utils.book_new();
          utils.book_append_sheet(workbook, worksheet, "Document");
          writeFile(workbook, `${props.document.title}.xlsx`, { compression: true });
        }
        
        }
      >
        <BsFiletypeXlsx fontSize="small" />
      </IconButton>
    </Tooltip>
  );  
}

export const DocumentActions = ({ document }) => {
  return (
    <ButtonActions
      inner={[
        [SaveXLSX, { document: document }],
        [SaveDocx, { document: document }],
        [CopyJson, { document: document }],
        [CopyText, { document: document }],
        [Link, { document: document }],
        [Group, { document: document }],
      ]}
    ></ButtonActions>
  );
};
