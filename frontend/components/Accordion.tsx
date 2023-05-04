import React, { useState } from "react";
import Stack from "@mui/material/Stack";

import DocViewer from "@/components/DocViewer";
import WindowDefinitions from "@/components/WindowFolder/WindowDefinitions";

import { useAppSelector, useAppDispatch } from "@/util/hooks";
import GroupPalette from "@/components/WindowModules/GroupPalette";
import TeleoscopePalette from "@/components/WindowModules/TeleoscopePalette";
import NotePalette from "@/components/WindowModules/NotePalette";
import BookmarkPalette from "@/components/BookmarkPalette";
import SettingsPalette from "@/components/SettingsPalette";
import AccordionSection from "@/components/AccordionSection";
import GroupViewer from "@/components/GroupViewer";
import Clusters from "@/components/Cluster/Clusters";
import WorkflowsPalette from "./WorkflowsPalette";
import NotesViewer from "./NotesViewer";
export default function SimpleAccordion(props) {
  const selection = useAppSelector((state) => state.windows.selection);
  return (
    <Stack
      sx={{ height: "100%", width: "100%" }}
      direction="column"
      justifyContent="space-between"
    >
      <div>
        {selection.nodes.map((node) => {
          if (node.data.type == "Document") {
            return (
              <DocViewer compact={true} id={node.id.split("%")[0]}></DocViewer>
            );
          }
          if (node.data.type == "Group") {
            return (
              <GroupViewer compact={true} id={node.id.split("%")[0]}></GroupViewer>
            )
          }
          if (node.data.type == "Note") {
            return (
              <NotesViewer compact={true} id={node.id.split("%")[0]}></NotesViewer>
            )
          }
        })}
      </div>

      <div>
        <AccordionSection
          compact={props.compact}
          icon={WindowDefinitions()["Workflows"].icon()}
          text="Workflows"
        >
          <WorkflowsPalette />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={WindowDefinitions()["Teleoscope Palette"].icon()}
          text="Teleoscopes"
        >
          <TeleoscopePalette />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={WindowDefinitions()["Group Palette"].icon()}
          text="Groups"
        >
          <GroupPalette />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={WindowDefinitions()["Clusters"].icon()}
          text="Clusters"
        >
          <Clusters />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={WindowDefinitions()["Note Palette"].icon()}
          text="Notes"
        >
          <NotePalette />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={WindowDefinitions()["Bookmarks"].icon()}
          text="Bookmarks"
        >
          <BookmarkPalette />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={WindowDefinitions()["Settings"].icon()}
          text="Settings"
        >
          <SettingsPalette />
        </AccordionSection>
      </div>
    </Stack>
  );
}
