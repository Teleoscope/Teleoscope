import React, { useContext } from "react";
import { swrContext } from "@/util/swr";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Typography, Stack, List, ListItem, Divider } from "@mui/material";
import WindowDefinitions from "@/components/WindowFolder/WindowDefinitions";
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import DocumentListItem from "@/components/Documents/DocumentListItem";
import { CopyJson, CopyText, SaveDocx } from "@/components/GroupActions";
import ButtonActions from "@/components/ButtonActions";
export default function DocViewer(props) {
  const swr = useContext(swrContext);
  const { group } = swr.useSWRAbstract("group", `groups/${props.id}`);
  const settings = useAppSelector((state) => state.windows.settings);
  const data = group?.history[0].included_documents.map((p) => {
    return [p, 1.0];
  });

  return (
    <Accordion defaultExpanded={settings.defaultExpanded} disableGutters={true} square={true}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="panel3a-content"
        id="panel3a-header"
      >
          <Typography noWrap align="left">
            {WindowDefinitions()["Group"].icon(group)}
            {`${group?.history[0].label}`}
          </Typography>

      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1} sx={{ margin: "1em" }}>
          <Typography variant="h5">{group?.history[0].label}</Typography>
          <Divider></Divider>
          <ButtonActions
          inner={[
            [
              SaveDocx,
              {
                swr: swr,
                data: data,
                group: group,
              },
            ],
            [
              CopyJson,
              {
                swr: swr,
                data: data,
                group: group,
              },
            ],
            [
              CopyText,
              {
                swr: swr,
                data: data,
                group: group,
              },
            ],
          ]}
        ></ButtonActions>
          <List>
            {group?.history[0].included_documents.map(docid => <DocumentListItem key={docid} id={docid}></DocumentListItem>)}
          </List>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
