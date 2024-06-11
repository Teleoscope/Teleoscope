import { useAppSelector } from "@/lib/hooks";
import DocViewer from "@/components/Sidebar/DocViewer";
import GroupViewer from "@/components/Sidebar/GroupViewer";
import NotesViewer from "@/components/Sidebar/NotesViewer";
import TeleoscopeViewer from "@/components/Sidebar/TeleoscopeViewer";
import ProjectionViewer from "@/components/Sidebar/ProjectionViewer";
import OperationViewer from "./OperationViewer";

export default function SelectionViewer({ noGroup }) {
  const selection = useAppSelector((state) => state.windows.selection);
  return (
    <div className="flex flex-col flex-1 justify-between items-center w-full overflow-x-hidden [&>*]:w-full">
      {selection.nodes.map((node) => {
        if (node.data.type == "Document") {
          return (
            <DocViewer
              windata={node.data}
              key={node.id.split("%")[0]}
              id={node.id.split("%")[0]}
            />
          );
        }
        if (node.data.type == "Group" && !noGroup) {
          return (
            <GroupViewer
              compact={true}
              key={node.id.split("%")[0]}
              id={node.id.split("%")[0]}
            ></GroupViewer>
          );
        }
        if (node.data.type == "Projection" && !noGroup) {
          return (
            <ProjectionViewer
              compact={true}
              key={node.id.split("%")[0]}
              id={node.id.split("%")[0]}
            ></ProjectionViewer>
          );
        }
        if (node.data.type == "Note") {
          return (
            <NotesViewer
              compact={true}
              key={node.id.split("%")[0]}
              id={node.id.split("%")[0]}
            ></NotesViewer>
          );
        }

        if (node.data.type == "Teleoscope" && !noGroup) {
          return (
            <TeleoscopeViewer
              compact={true}
              key={node.id.split("%")[0]}
              id={node.id.split("%")[0]}
            ></TeleoscopeViewer>
          );
        }

        if ((node.data.type == "Union" || node.data.type == "Exclusion" || node.data.type == "Intersection" || node.data.type == "Difference") && !noGroup) {
          return (
            <OperationViewer
              compact={true}
              type={node.data.type}
              key={node.id.split("%")[0]}
              id={node.id.split("%")[0]}
            ></OperationViewer>
          );
        }



      })}
    </div>
  );
}
