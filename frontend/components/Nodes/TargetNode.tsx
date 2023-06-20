import { memo } from "react";
import { Handle, Position } from "reactflow";
import BaseNode from "@/components/Nodes/BaseNode";

function TargetNode({ data, id, selected }) {
  return (
    <>
      <BaseNode data={data} id={id} selected={selected} />
      
      <Handle type="target" position={Position.Left} id={`${id}_control`} />
    </>
  );
}
export default memo(TargetNode)