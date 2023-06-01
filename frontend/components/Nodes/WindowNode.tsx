import { memo, useContext } from "react";
import { Handle, Position, useStore } from "reactflow";
import WindowFactory from "@/components/WindowFolder/WindowFactory";
import { NodeResizer } from "@reactflow/node-resizer";
import "@reactflow/node-resizer/dist/style.css";
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { StompContext } from "@/components/Stomp";
import { addEdge } from "reactflow";

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
      case "Cluster":
        return "target";
      default:
        return null;
    }
  }

  const handleType = getHandleType(data.type);

  const { nodes, edges, logical_clock } = useAppSelector(
    (state) => state.windows
  );

  const client = useContext(StompContext);

  const onConnect = (connection) => {
    const alledges = addEdge(connection, edges);
    client.update_edges(alledges);
  };

  return (
    <>
      <NodeResizer
        color="#ff0071"
        isVisible={selected}
        minWidth={windata.minWidth}
        minHeight={windata.minHeight}
      />
      <WindowFactory id={data.i} size={size} windata={windata} />
      {handleType && (
        <Handle
          type={handleType}
          position={handleType === "source" ? Position.Right : Position.Left}
          id={data.i}
          isConnectable={true}
          onConnect={onConnect}
        />
      )}
    </>
  );
}

export default memo(WindowNode);
