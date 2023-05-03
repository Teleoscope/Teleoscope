import React, { useState } from "react";
import Accordion from "@mui/material/Accordion";
import Stack from "@mui/material/Stack";

import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DocViewer from "@/components/DocViewer";
import WindowDefinitions from "@/components/WindowFolder/WindowDefinitions";

import { useAppSelector, useAppDispatch } from "@/util/hooks";
import GroupPalette from "@/components/WindowModules/GroupPalette";
import TeleoscopePalette from "@/components/WindowModules/TeleoscopePalette";
import NotePalette from "@/components/WindowModules/NotePalette";
import BookmarkPalette from "@/components/BookmarkPalette";
import SettingsPalette from "@/components/SettingsPalette";

import Clusters from "@/components/Cluster/Clusters";
import WorkflowsPalette from "./WorkflowsPalette";
export default function SimpleAccordion(props) {
  const selection = useAppSelector((state) => state.windows.selection);

  const Section = (props) => {
    const [expanded, setExpanded] = useState(false); 
    return (
      <Accordion  expanded={expanded} disableGutters={true} square={true}>
        <AccordionSummary
          onClick={() => setExpanded(!expanded)}
          expandcompact={props.compact}
          aria-controls="panel2a-content"
          id="panel2a-header"
        >
          <Typography noWrap>
            {props.icon} {props.compact ? "" : props.text}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>{props.children}</AccordionDetails>
      </Accordion>
    );
  };

  return (
    <Stack sx={{ height: "100%", width: "100%" }}    direction="column"
     justifyContent="space-between">
      <div>
        {selection.nodes.map((node) => {
          if (node.data.type == "Document") {
            return (
              <DocViewer compact={true} id={node.id.split("%")[0]}></DocViewer>
            );
          }
        })}
      </div>

      <div>
        <Section
          compact={props.compact}
          icon={WindowDefinitions()["Workflows"].icon()}
          text="Workflows"
        >
          <WorkflowsPalette />
        </Section>
        <Section
          compact={props.compact}
          icon={WindowDefinitions()["Teleoscope Palette"].icon()}
          text="Teleoscopes"
        >
          <TeleoscopePalette />
        </Section>
        <Section
          compact={props.compact}
          icon={WindowDefinitions()["Group Palette"].icon()}
          text="Groups"
        >
          <GroupPalette />
        </Section>
        <Section
          compact={props.compact}
          icon={WindowDefinitions()["Clusters"].icon()}
          text="Clusters"
        >
          <Clusters />
        </Section>
        <Section
          compact={props.compact}
          icon={WindowDefinitions()["Note Palette"].icon()}
          text="Notes"
        >
          <NotePalette />
        </Section>
        <Section
          compact={props.compact}
          icon={WindowDefinitions()["Bookmarks"].icon()}
          text="Bookmarks"
        >
          <BookmarkPalette />
        </Section>
        <Section
          compact={props.compact}
          icon={WindowDefinitions()["Settings"].icon()}
          text="Settings"
        >
          <SettingsPalette />
        </Section>
      </div>
    </Stack>
  );
}
