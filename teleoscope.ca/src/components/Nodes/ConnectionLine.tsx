
import { useAppSelector } from "@/lib/hooks";

export default ({
    fromX,
    fromY,
    fromPosition,
    toX,
    toY,
    toPosition,
    connectionLineType,
    connectionLineStyle,
  }) => {
    const settings = useAppSelector((state) => state.appState.workflow.settings);

    return (
      <g>
        <path
          fill="none"
          stroke={settings.color}
          strokeWidth={1.5}
          className="animated"
          d={`M${fromX},${fromY} C ${fromX} ${toY} ${fromX} ${toY} ${toX},${toY}`}
        />
        <circle cx={toX} cy={toY} fill="#fff" r={3} stroke={settings.color} strokeWidth={1.5} />
      </g>
    );
  };