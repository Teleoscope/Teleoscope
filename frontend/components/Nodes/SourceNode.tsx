import { memo } from "react";
import { Handle, Position } from "reactflow";
import BaseNode from "@/components/Nodes/BaseNode";


function TargetNode({ data, id, selected }) {
  return (
    <>
      <BaseNode data={data} id={id} selected={selected} />
      
      <Handle type="source" position={Position.Right} id={`${id}_output`} />
    </>
  );
}
export default memo(TargetNode)