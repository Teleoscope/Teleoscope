import { useStore } from "reactflow";
import WindowFactory from "@/components/WindowFolder/WindowFactory";
import { NodeResizer } from "@reactflow/node-resizer";

const defaultSize = (s, id) => {
  const node = s.nodeInternals.get(id);
  return {
    x: node.positionAbsolute.x,
    y: node.positionAbsolute.y,
    width: node.width,
    height: node.height,
    minHeight: 35,
    minWidth: 60,
  };
}

function BaseNode({ data, id, selected }) {
  const size = useStore(s => defaultSize(s, id) );
  const windata = { ...data, ...size };

  return (
      <>
      <NodeResizer
          color="#ff0071"
          isVisible={selected}
          minWidth={windata.minWidth}
          minHeight={windata.minHeight}
        />
        <WindowFactory size={size} windata={windata} id={id} />
      </>
  );
}

export default BaseNode;
