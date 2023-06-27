import React from "react";
import Stack from "@mui/material/Stack";
import { useSelector } from "react-redux";
import WindowDefinitions from "@/components/WindowFolder/WindowDefinitions";

import Groups from "@/components/Groups";
import Teleoscopes from "@/components/Teleoscopes";
import Notes from "@/components/Notes";
import Bookmarks from "@/components/Bookmarks";
import Setttings from "@/components/Settings";
import AccordionSection from "@/components/AccordionSection";
import SelectionViewer from "@/components/SelectionViewer";
import ProjectionPalette from "@/components/Cluster/ProjectionPalette";
import Workflows from "@/components/Workflows";


export default function SimpleAccordion(props) {
  const windowState = useSelector((state) => state.windows);
  const wdefs = WindowDefinitions(windowState);
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
          <Workflows />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={wdefs["Teleoscopes"].icon()}
          text="Teleoscopes"
        >
          <Teleoscopes />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={wdefs["Groups"].icon()}
          text="Groups"
        >
          <Groups />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={wdefs["Projections"].icon()}
          text="Projections"
        >
          <ProjectionPalette />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={wdefs["Notes"].icon()}
          text="Notes"
        >
          <Notes />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={wdefs["Bookmarks"].icon()}
          text="Bookmarks"
        >
          <Bookmarks />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={wdefs["Settings"].icon()}
          text="Settings"
        >
          <Setttings />
        </AccordionSection>
      </div>
    </Stack>
  );
}
