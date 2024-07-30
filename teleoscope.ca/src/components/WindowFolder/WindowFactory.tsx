import Window from "@/components/WindowFolder/Window";
import { useAppSelector } from "@/lib/hooks";
import { NodeData } from "../Nodes/BaseNode";
import { useSWRF } from "@/lib/swr";
import { Documents } from "@/types/documents";
import { Groups } from "@/types/groups";
import WindowDefinitions from "./WindowDefinitions";
import { Search } from "@/types/search";

export interface WindowProps extends NodeData {
  data: Groups | Documents | Search | null
}

export default function WindowFactory({ reactflow_node: r, graph_node: g}: NodeData) {
  const W = WindowDefinitions(r.type);
  const oid = g?.reference
  
  const { data } = useSWRF(oid ? `/api/${W.apipath}?${W.apipath}=${oid}` : null)

  const default_color = useAppSelector((state: RootState) => state.appState.workflow.settings.color)
  const color = data?.color ? data.color : default_color

  const props: WindowProps = {
    reactflow_node: r,
    graph_node: g,
    data: data
  }

  if (r.type == "FABMenu") {
    return <div>{W.component(props)}</div>;
  }

  return (
    <Window
      icon={W.icon(color)}
      title={W.title(data)}
      color={color}
      inner={W.component(props)}
      reactflow_node={r}
    />
  );
}
