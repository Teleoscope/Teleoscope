import { useAppSelector } from "@/lib/hooks";
import DocViewer from "@/components/Sidebar/DocViewer";
import GroupViewer from "@/components/Sidebar/GroupViewer";
import NotesViewer from "@/components/Sidebar/NotesViewer";
import RankViewer from "@/components/Sidebar/RankViewer";
import ProjectionViewer from "@/components/Sidebar/ProjectionViewer";
import OperationViewer from "./OperationViewer";
import { Node } from "reactflow";
import { useSWRF } from "@/lib/swr";
import { Graph } from "@/types/graph";

export default function SelectionViewer({ noGroup = false }) {
  const selection = useAppSelector((state) => state.appState.workflow.selection);
  const uids = selection.nodes.map((n: Node) => n.id).join(",")
  const { data: nodes }:{ data: Array<Graph>} = useSWRF(`/api/graph?uids=${uids}`)
  
  return (
    <div className="flex flex-col flex-1 justify-between items-center w-full overflow-x-hidden [&>*]:w-full">
      {selection.nodes.map((node: Node) => {
        const graph_item = Array.isArray(nodes) ? nodes.find((n) => n.uid === node.id) : undefined;
        const reference = graph_item?.reference
        if (node.data.type == "Document") {
          return (
            <DocViewer
              windata={node.data}
              key={node.id}
              id={node.id}
              reference={reference}
            />
          );
        }
        if (node.data.type == "Group" && !noGroup) {
          return (
            <GroupViewer
              compact={true}
              key={node.id}
              id={node.id}
              reference={reference}
            ></GroupViewer>
          );
        }
        if (node.data.type == "Projection" && !noGroup) {
          return (
            <ProjectionViewer
              compact={true}
              key={node.id}
              id={node.id}
            ></ProjectionViewer>
          );
        }
        if (node.data.type == "Note") {
          return (
            <NotesViewer
              compact={true}
              key={node.id}
              id={node.id}
            ></NotesViewer>
          );
        }

        if (node.data.type == "Rank" && !noGroup) {
          return (
            <RankViewer
              compact={true}
              key={node.id}
              id={node.id}
            ></RankViewer>
          );
        }

        if ((node.data.type == "Union" || node.data.type == "Exclusion" || node.data.type == "Intersection" || node.data.type == "Difference") && !noGroup) {
          return (
            <OperationViewer
              compact={true}
              type={node.data.type}
              key={node.id}
              id={node.id}
            ></OperationViewer>
          );
        }



      })}
    </div>
  );
}
