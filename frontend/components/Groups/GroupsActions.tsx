import { MakeDocx } from "@/util/DocxMaker";
import { IconButton, Tooltip } from "@mui/material";
import {
  Download as DownloadIcon,
  ContentCopy as ContentCopyIcon,
  CopyAll as CopyAllIcon,
  Diversity2 as Diversity2Icon,
} from "@mui/icons-material";
import { useSelector } from "react-redux";


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
        <DownloadIcon fontSize="small" />
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
