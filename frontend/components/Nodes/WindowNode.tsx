import { memo } from "react";
import { Handle, Position, useStore } from "reactflow";
import WindowFactory from "@/components/WindowFolder/WindowFactory";
import { NodeResizer } from "@reactflow/node-resizer";
import "@reactflow/node-resizer/dist/style.css";

function WindowNode({ data, id, selected }) {

  const size = useStore((s) => {
    const node = s.nodeInternals.get(id);
    return {
      x: node.positionAbsolute.x,
      y: node.positionAbsolute.y,
      width: node.width,
      height: node.height,
      minHeight: 35,
      minWidth: 60,
    };
  });

  const windata = { ...data, ...size };

  const getHandleType = (dataType) => {
    switch(dataType) {
      case "Document":
      case "Group":
      case "Note":
        return "source";
      case "Teleoscope":
        return "target";
      default:
        return null;
    }
  }

  const handleType = getHandleType(data.type);

  return (
    <>
      <NodeResizer
        color="#ff0071"
        isVisible={selected}
        minWidth={windata.minWidth}
        minHeight={windata.minHeight}
      />
      <WindowFactory size={size} windata={windata} />
      {handleType && (
        <Handle
          type={handleType}
          position={handleType === "source" ? Position.Right : Position.Left}
          id={data.i}
          isConnectable={true}
        />
      )}
    </>
  );
}

export default memo(WindowNode);
