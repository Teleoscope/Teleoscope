import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from 'reactflow';
import { useAppSelector } from "@/util/hooks";

const onEdgeClick = (evt, id) => {
  evt.stopPropagation();
  alert(`remove ${id}`);
};

const buttonStyle = {
  width: "20px",
  height: "20px",
  background: "#eee",
  border: "1px solid #fff",
  cursor: "pointer",
  borderRadius: "50%",
  fontSize: "12px",
  lineHeight: "1",
}

// this is a little helper component to render the actual edge label
function EdgeLabel({ transform, label }: { transform: string; label: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        background: 'transparent',
        padding: 10,
        color: '#ff5050',
        fontSize: 12,
        fontWeight: 700,
        transform,
      }}
      className="nodrag nopan"
    >
      {label}
    </div>
  );
}

export default function ButtonEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {
    strokeWidth: 1.5
  }, markerEnd, }: EdgeProps)
{
 
  const selected_edges  = useAppSelector((state: RootState) => state.windows.selection.edges);
  const selected = selected_edges.find(e => e.id === id)
  if (selected) {
    style.strokeWidth = 2.5
  }
  
  const curvature = 0.15;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature
  });

  const settings = useAppSelector((state) => state.windows.settings);
  

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{stroke: settings.color, ...style}} />
      <EdgeLabelRenderer>
        {/* <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            // everything inside EdgeLabelRenderer has no pointer events by default
            // if you have an interactive element, set pointer-events: all
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button style={buttonStyle} onClick={(event) => onEdgeClick(event, id)}>
            ×
          </button>
        </div> */}
        {/* <EdgeLabel
            transform={`translate(-50%, 0) translate(${targetX}px,${targetY}px)`}
            label={`control`}
          /> */}
      </EdgeLabelRenderer>
    </>
  );
}
