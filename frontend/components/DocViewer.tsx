import React, { useContext } from "react";
import { swrContext } from "@/util/swr";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";

import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CopyAllIcon from "@mui/icons-material/CopyAll";
import LinkIcon from "@mui/icons-material/Link";

import { Typography, Stack, List, ListItem, Divider } from "@mui/material";
import WindowDefinitions from "./WindowFolder/WindowDefinitions";
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import ButtonActions from "@/components/ButtonActions";
import GroupSelector from "@/components/GroupSelector";

export default function DocViewer(props) {
  const swr = useContext(swrContext);
  const { document } = props.windata?.demo ? props.windata.demodata : swr.useSWRAbstract("document", `document/${props.id}`);
  const settings = useAppSelector((state) => state.windows.settings);

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

  const Group = () => <GroupSelector id={1} />;

  const copyTextToClipboard = () =>
    navigator.clipboard.writeText(`${document.title} \n ${document.text}`);
  const copyJsonToClipboard = () =>
    navigator.clipboard.writeText(JSON.stringify(document, null, 2));

  const CopyText = () => {
    return (
      <Tooltip title="Copy text to clipboard" key="Copy text to clipboard">
        <IconButton onClick={copyTextToClipboard}>
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );
  };

  const CopyJson = () => {
    return (
      <Tooltip
        title="Copy metadata to clipboard"
        key="Copy metadata to clipboard"
      >
        <IconButton onClick={copyJsonToClipboard}>
          <CopyAllIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );
  };
  return (
    <Accordion
      defaultExpanded={settings.defaultExpanded}
      disableGutters={true}
      square={true}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="panel3a-content"
        id="panel3a-header"
      >
        <Typography noWrap align="left">
          {WindowDefinitions()["Document"].icon()}
          {`${document?.title.slice(0, 20)}...`}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1} sx={{ margin: "1em" }}>
          <Typography variant="h5">{document?.title}</Typography>
          <Divider></Divider>
          <ButtonActions
            inner={[CopyJson, CopyText, Link, Group]}
          ></ButtonActions>
          <Typography variant="body">{document?.text}</Typography>
          <List>
            {document?.metadata
              ? Object.entries(document.metadata).map(([key, value]) => {
                  return (
                    <ListItem key={key + value}>
                      <Typography variant="caption" sx={{ marginRight: "1em" }}>
                        {key}:{" "}
                      </Typography>
                      <Typography noWrap variant="caption">
                        {JSON.stringify(value)}
                      </Typography>
                    </ListItem>
                  );
                })
              : ""}
          </List>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
