import { memo } from "react";
import { Position } from "reactflow";
import BaseNode from "@/components/Nodes/BaseNode";
import Handle from "@/components/Nodes/Handle";

function TargetNode({ data, id, selected }) {
  return (
    <>
      <BaseNode data={data} id={id} selected={selected} />
      
      <Handle type="target" position={Position.Left} id={`${id}_control`} />
    </>
  );
}
export default memo(TargetNode)