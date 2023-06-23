import { memo } from "react";
import { Position } from "reactflow";
import BaseNode from "@/components/Nodes/BaseNode";
import Handle from "@/components/Nodes/Handle";

function SourceNode({ data, id, selected }) {
  return (
    <>
      <BaseNode data={data} id={id} selected={selected} />
      
      <Handle type="target" position={Position.Top}    id={`${id}_source`}  />
      <Handle type="target" position={Position.Bottom} id={`${id}_control`} />
      <Handle type="source" position={Position.Right}  id={`${id}_output`}  />
    </>
  );
}

export default memo(SourceNode);
