import FABMenu from "@/components/FABMenu";

export default function FABWrapper({reactFlowInstance}) {
    const coords = { x: 0, y: 0, width: 1 };
    if (reactFlowInstance) {
      const vp = reactFlowInstance.screenToFlowPosition({ x: 100, y: 100 });
      coords.x = vp.x;
      coords.y = vp.y;
    }
    return <FABMenu reactflow_node={{ x: coords.x, y: coords.y, width: 1 }} />;
  }