import { useCallback } from "react";
import { Handle, Position } from "reactflow";
import Search from "@/components/WindowModules/Search";

const handleStyle = { left: 10 };

export default function SearchNode({ data }) {
  const onChange = useCallback((evt) => {
    console.log(evt.target.value);
  }, []);

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div>
        <Search></Search>
      </div>
      <Handle type="source" position={Position.Bottom} id="a" />
      <Handle
        type="source"
        position={Position.Bottom}
        id="b"
        style={handleStyle}
      />
    </>
  );
}
