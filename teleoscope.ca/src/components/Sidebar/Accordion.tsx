import Groups from "@/components/Groups/Groups";
import Notes from "@/components/Notes/Notes";
import Bookmarks from "@/components/Bookmarks";
import Setttings from "@/components/Settings";
import AccordionSection from "@/components/Sidebar/AccordionSection";
import SelectionViewer from "@/components/Sidebar/SelectionViewer";
import Workflows from "@/components/Sidebar/WorkflowViewer";
import Uploader from "@/components/Uploader";
import { useAppSelector, useWindowDefinitions } from "@/lib/hooks";
import References from "@/components/Sidebar/RefViewer";

export default function SimpleAccordion({ compact }) {
  const wdefs = useWindowDefinitions();
  const selection = useAppSelector((state) => state.windows.selection);

  return (
      <div className="flex flex-col flex-1  w-full  overflow-x-hidden text-black">
      <SelectionViewer/>
            
      <div className="flex flex-col   w-full  ">
      {selection.nodes.length > 0 && selection.nodes.filter((n) => n.data.type == "Document").length > 0 ? (
          <AccordionSection
            compact={compact}
            icon={wdefs.definitions()["Workflows"].icon()}
            text="Connections"
          >
            <References />
          </AccordionSection>
        ) : (
          ""
        )}

      <AccordionSection
          compact={compact}
          icon={wdefs.definitions()["Workflows"].icon()}
          text="Upload"
        >
          <Uploader />
        </AccordionSection>
        <AccordionSection
          compact={compact}
          icon={wdefs.definitions()["Workflows"].icon()}
          text="Workflows"
        >
          <Workflows />
        </AccordionSection>
        <AccordionSection
          compact={compact}
          icon={wdefs.definitions()["Groups"].icon()}
          text="Groups"
        >
          <Groups />
        </AccordionSection>
        <AccordionSection
          compact={compact}
          icon={wdefs.definitions()["Bookmarks"].icon()}
          text="Bookmarks"
        >
          <Bookmarks />
        </AccordionSection>
        <AccordionSection
          compact={compact}
          icon={wdefs.definitions()["Notes"].icon()}
          text="Notes"
        >
          <Notes />
        </AccordionSection>
        <AccordionSection
          compact={compact}
          icon={wdefs.definitions()["Settings"].icon()}
          text="Settings"
        >
          <Setttings />
        </AccordionSection>
      </div>
    </div>
  );
}
