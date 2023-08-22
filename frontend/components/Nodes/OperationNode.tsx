import { memo } from "react";
import { Position } from "reactflow";
import BaseNode from "@/components/Nodes/BaseNode";
import Handle from "@/components/Nodes/Handle";

function OperationNode({ data, id, selected }) {

  return (
    <>
      <BaseNode data={data} id={id} selected={selected}  />
      <Handle type="target" variant="source" position={Position.Left}  nodeid={id} id={`${id}_source`}  />
      <Handle type="target" variant="control" position={Position.Left} nodeid={id} id={`${id}_control`} />
      <Handle type="source" variant="output" position={Position.Right} nodeid={id} id={`${id}_output`}  />
    </>
  );
}

export default memo(OperationNode);
