import React, { useState } from "react";
import Stack from "@mui/material/Stack";

import WindowDefinitions from "@/components/WindowFolder/WindowDefinitions";

import GroupPalette from "@/components/WindowModules/GroupPalette";
import TeleoscopePalette from "@/components/WindowModules/TeleoscopePalette";
import NotePalette from "@/components/WindowModules/NotePalette";
import BookmarkPalette from "@/components/BookmarkPalette";
import SettingsPalette from "@/components/SettingsPalette";
import AccordionSection from "@/components/AccordionSection";
import SelectionViewer from "@/components/SelectionViewer";

import Clusters from "@/components/Cluster/Clusters";
import WorkflowsPalette from "@/components/WorkflowsPalette";
export default function SimpleAccordion(props) {
  const wdefs = WindowDefinitions();
  return (
    <Stack
      sx={{ height: "100%", width: "100%" }}
      direction="column"
      justifyContent="space-between"
    >
      <SelectionViewer></SelectionViewer>

      <div>
        <AccordionSection
          compact={props.compact}
          icon={wdefs["Workflows"].icon()}
          text="Workflows"
        >
          <WorkflowsPalette />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={wdefs["Teleoscope Palette"].icon()}
          text="Teleoscopes"
        >
          <TeleoscopePalette />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={wdefs["Group Palette"].icon()}
          text="Groups"
        >
          <GroupPalette />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={wdefs["Clusters"].icon()}
          text="Clusters"
        >
          <Clusters />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={wdefs["Note Palette"].icon()}
          text="Notes"
        >
          <NotePalette />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={wdefs["Bookmarks"].icon()}
          text="Bookmarks"
        >
          <BookmarkPalette />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={wdefs["Settings"].icon()}
          text="Settings"
        >
          <SettingsPalette />
        </AccordionSection>
      </div>
    </Stack>
  );
}
