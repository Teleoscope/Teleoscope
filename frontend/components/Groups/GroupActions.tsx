import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CopyAllIcon from "@mui/icons-material/CopyAll";
import Tooltip from "@mui/material/Tooltip";

import IconButton from "@mui/material/IconButton";
import { MakeDocx } from "@/util/DocxMaker";
import { utils, writeFile } from "xlsx";

import { BsFiletypeXlsx } from "react-icons/bs";
import { BsFiletypeDocx } from "react-icons/bs";

const fetchdocs = async ({ data, swr }) => {
  let docs = [];
  for (const [pid, s] of data) {
    const response = await fetch(`/api/${swr.subdomain}/document/${pid}`).then(
      (res) => res.json() 
    );
    docs = docs.concat([response]);
  }
  return docs;
};

const copyTextToClipboard = async (props) => {
  const docs = await fetchdocs(props);
  const output = docs
    .map(({ title, text }) => {
      return `${title}\n${text}\n\n`;
    })
    .reduce((acc, curr) => acc + curr, `${props.group?.history[0].label}\n`);

  navigator.clipboard.writeText(output);
};
const copyJsonToClipboard = async (props) => {
  const docs = await fetchdocs(props);
  navigator.clipboard.writeText(JSON.stringify(docs, null, 2));
};

const createDocx = async (props) => {
  const docs = await fetchdocs(props);
  MakeDocx({
    tag: "Group",
    title: props.group.history[0].label,
    groups: [
      {
        label: props.group.history[0].label,
        documents: docs,
      },
    ],
  });
};


const createXLSX = async (props) => {
  const docs = await fetchdocs(props);
  
  const doc_map = docs.map((doc) => {
    const ret = { ...doc, ...doc.metadata, ...{ label: props.group.history[0]["label"] } };
    return ret
  });
  // console.log("documents", doc_map)
  const worksheet = utils.json_to_sheet(doc_map);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "Document");
  writeFile(workbook, "Document.xlsx", { compression: true });  
}

export const CopyText = (props) => {
  return (
    <Tooltip title="Copy text to clipboard" key="Copy text to clipboard">
      <IconButton onClick={() => copyTextToClipboard(props)}>
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
      <IconButton onClick={() => copyJsonToClipboard(props)}>
        <CopyAllIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

export const SaveDocx = (props) => {
  return (
    <Tooltip title="Download as Docx" key="Download as Docx">
      <IconButton onClick={() => createDocx(props)}>
        <BsFiletypeDocx fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};





export const SaveXLSX = (props) => {
  return (
    <Tooltip title="Download as XLSX" key="Download as XLSX">
      <IconButton
        onClick={() => createXLSX(props)}
      >
        <BsFiletypeXlsx fontSize="small" />
      </IconButton>
    </Tooltip>
  );  
}
