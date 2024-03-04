import Stack from "@mui/material/Stack";
import Groups from "@/components/Groups/Groups";
import Notes from "@/components/Notes/Notes";
import Bookmarks from "@/components/Bookmarks";
import Setttings from "@/components/Settings";
import AccordionSection from "@/components/Sidebar/AccordionSection";
import SelectionViewer from "@/components/Sidebar/SelectionViewer";
import Workflows from "@/components/Sidebar/WorkflowViewer";
import { useWindowDefinitions } from "@/util/hooks";
import Uploader from "@/components/Uploader";

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
          text="Upload"
        >
          <Uploader />
        </AccordionSection>
        <AccordionSection
          compact={props.compact}
          icon={wdefs.definitions()["Workflows"].icon()}
          text="Workflows"
        >
          <Workflows />
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
          icon={wdefs.definitions()["Bookmarks"].icon()}
          text="Bookmarks"
        >
          <Bookmarks />
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
          icon={wdefs.definitions()["Settings"].icon()}
          text="Settings"
        >
          <Setttings />
        </AccordionSection>
      </div>
    </Stack>
  );
}
