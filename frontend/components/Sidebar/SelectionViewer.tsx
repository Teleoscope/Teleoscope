import { useAppSelector } from "@/util/hooks";
import DocViewer from "@/components/Sidebar/DocViewer";
import GroupViewer from "@/components/Sidebar/GroupViewer";
import NotesViewer from "@/components/Sidebar/NotesViewer";
import TeleoscopeViewer from "@/components/Sidebar/TeleoscopeViewer";
import ClusterViewer from "@/components/Sidebar/ClusterViewer";
import OperationViewer from "./OperationViewer";

export default function SelectionViewer(props) {
  const selection = useAppSelector((state) => state.windows.selection);
  return (
    <div>
      {selection.nodes.map((node) => {
        if (node.data.type == "Document") {
          return (
            <DocViewer
              compact={true}
              windata={node.data}
              key={node.id.split("%")[0]}
              id={node.id.split("%")[0]}
            ></DocViewer>
          );
        }
        if (node.data.type == "Group" && !props.noGroup) {
          return (
            <GroupViewer
              compact={true}
              key={node.id.split("%")[0]}
              id={node.id.split("%")[0]}
            ></GroupViewer>
          );
        }
        if (node.data.type == "Projection" && !props.noGroup) {
          return (
            <ClusterViewer
              compact={true}
              key={node.id.split("%")[0]}
              id={node.id.split("%")[0]}
            ></ClusterViewer>
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

        if (node.data.type == "Teleoscope" && !props.noGroup) {
          return (
            <TeleoscopeViewer
              compact={true}
              key={node.id.split("%")[0]}
              id={node.id.split("%")[0]}
            ></TeleoscopeViewer>
          );
        }


        if ((node.data.type == "Union" || node.data.type == "Exclusion" || node.data.type == "Intersection" || node.data.type == "Difference") && !props.noGroup) {
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
