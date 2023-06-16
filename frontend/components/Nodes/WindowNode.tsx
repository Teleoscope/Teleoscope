import { memo } from "react";
import { Handle, Position } from "reactflow";
import BaseNode from "@/components/Nodes/BaseNode";

function WindowNode({ data, id, selected }) {
  return (
      <BaseNode data={data} id={id} selected={selected} />
  );
}

export default memo(WindowNode);
