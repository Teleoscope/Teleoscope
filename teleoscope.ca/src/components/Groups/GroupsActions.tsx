import { MakeDocx } from "@/util/DocxMaker";
import { IconButton, Tooltip } from "@mui/material";
import {
  ContentCopy as ContentCopyIcon,
  CopyAll as CopyAllIcon,
  Diversity2 as Diversity2Icon,
} from "@mui/icons-material";
import { useSelector } from "react-redux";
import { utils, writeFile } from "xlsx";

import { BsFiletypeDocx } from "react-icons/bs";
import { BsFiletypeXlsx } from "react-icons/bs";

// Button Action Functions
export const SaveDocxAction = (props) => {
  const { fetchgroups, session } = props;
  const label = useSelector((state) => state.windows.label);
  const createDocx = async () => {
    const groups = await fetchgroups();
    MakeDocx({
      tag: "All Groups for Session",
      title: label,
      groups: groups,
    });
  };

  return (
    <Tooltip title="Download as Docx" key="Download as Docx">
      <IconButton onClick={createDocx}>
        <BsFiletypeDocx fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

export const CopyJsonAction = (props) => {
  const { fetchgroups } = props;
  const copyJsonToClipboard = async () => {
    const groups = await fetchgroups();
    navigator.clipboard.writeText(JSON.stringify(groups, null, 2));
  };

  return (
    <Tooltip title="Copy metadata to clipboard">
      <IconButton onClick={copyJsonToClipboard}>
        <CopyAllIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

export const CopyTextAction = (props) => {
  const { fetchgroups } = props;
  const copyTextToClipboard = async () => {
    const groups = await fetchgroups();
    let acc = "";
    for (const group of groups) {
      acc = acc + `${group.history[0].label}\n`;
      for (const text of group.documents) {
        acc = acc + text.title;
        acc = acc + text.text;
      }
    }

    navigator.clipboard.writeText(acc);
  };

  return (
    <Tooltip title="Copy text to clipboard">
      <IconButton onClick={copyTextToClipboard}>
        <ContentCopyIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

function replaceSpecialChars(str) {
  return str.replace(/[\\/:*?[\]]/g, '_');
}


// Button Action Functions
export const SaveXLSXAction = (props) => {
  const { fetchgroups, session } = props;
  const label = useSelector((state) => state.windows.label);

  const createXLSX = async (props) => {
    const groups = await fetchgroups();
    const workbook = utils.book_new();
    
    groups.forEach((group) => {
      const docs = group.documents;  
      const doc_map = docs.map((doc) => {
        const ret = { ...doc, ...doc.metadata, ...{ label: replaceSpecialChars(group.history[0].label) } };
        return ret
      });
      const worksheet = utils.json_to_sheet(doc_map);
      utils.book_append_sheet(workbook, worksheet, replaceSpecialChars(group.history[0].label));
    })

    writeFile(workbook, `${label}.xlsx`, { compression: true });  
  }

  return (
    <Tooltip title="Download as XLSX" key="Download as XLSX">
      <IconButton onClick={createXLSX}>
        <BsFiletypeXlsx fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};








export const ClusterButtonAction = (props) => {
  const { runClusters } = props;

  return (
    <Tooltip title="Cluster on existing groups">
      <IconButton onClick={runClusters}>
        <Diversity2Icon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};
