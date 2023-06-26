import { useStore } from "reactflow";
import WindowFactory from "@/components/WindowFolder/WindowFactory";
import { NodeResizer } from "@reactflow/node-resizer";
import { useAppSelector } from "@/util/hooks";

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

const handleCSS = {
  width: "10px",
  height: "10px",
  borderRadius: "100%",
}

function BaseNode({ data, id, selected }) {
  const size = useStore(s => defaultSize(s, id) );
  const windata = { ...data, ...size };
  const settings = useAppSelector((state) => state.windows.settings);

  return (
      <>
      <NodeResizer
          color={settings.color}
          isVisible={selected}
          minWidth={windata.minWidth}
          minHeight={windata.minHeight}
          handleStyle={handleCSS}
        />
        <WindowFactory size={size} windata={windata} id={id} />
      </>
  );
}

export default BaseNode;
