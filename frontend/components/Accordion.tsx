import Stack from "@mui/material/Stack";
import Groups from "@/components/Groups";
import Teleoscopes from "@/components/Teleoscopes";
import Notes from "@/components/Notes";
import Bookmarks from "@/components/Bookmarks";
import Setttings from "@/components/Settings";
import AccordionSection from "@/components/AccordionSection";
import SelectionViewer from "@/components/SelectionViewer";
import ProjectionPalette from "@/components/Cluster/ProjectionPalette";
import Workflows from "@/components/Workflows";
import { useWindowDefinitions } from "@/util/hooks";


export default function SimpleAccordion(props) {
  const wdefs = useWindowDefinitions();
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
          icon={wdefs.definitions()["Workflows"].icon()}
          text="Workflows"
        >
          <Workflows />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={wdefs.definitions()["Teleoscopes"].icon()}
          text="Teleoscopes"
        >
          <Teleoscopes />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={wdefs.definitions()["Groups"].icon()}
          text="Groups"
        >
          <Groups />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={wdefs.definitions()["Projections"].icon()}
          text="Projections"
        >
          <ProjectionPalette />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={wdefs.definitions()["Notes"].icon()}
          text="Notes"
        >
          <Notes />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={wdefs.definitions()["Bookmarks"].icon()}
          text="Bookmarks"
        >
          <Bookmarks />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={wdefs.definitions()["Settings"].icon()}
          text="Settings"
        >
          <Setttings />
        </AccordionSection>
      </div>
    </Stack>
  );
}
