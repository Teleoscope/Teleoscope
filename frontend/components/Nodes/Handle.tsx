import { Handle, useStore } from "reactflow";
import { useAppSelector, useGlobalMousePosition } from "@/util/hooks";
import { renderToString } from 'react-dom/server';
import { FaArrowRight } from "react-icons/fa";
import ReactFlow, { useReactFlow } from 'reactflow';


const defaultSize = (s, id) => {
    const node = s.nodeInternals.get(id);
    if (!node) { return }
    return {
      x: node.positionAbsolute.x,
      y: node.positionAbsolute.y,
      width: node.width,
      height: node.height,
      minHeight: 35,
      minWidth: 60,
    }
  }

function calculateDistanceToEdges(mouse, box) {
    const boxLeft = box.x;
    const boxTop = box.y;
    const boxRight = box.x + box.width;
    const boxBottom = box.y + box.height;
  
    const dy = Math.max(boxTop - mouse.y, 0, mouse.y - boxBottom);
    const dx = Math.max(boxLeft - mouse.x, 0, mouse.x - boxRight);
  
    return Math.sqrt(dx * dx + dy * dy)
}

export default function HandleWrapper({ type, id, nodeid, position, variant }) {
    const flow = useReactFlow()

    const edges = useAppSelector((state) => state.windows.edges);
    const settings = useAppSelector((state) => state.windows.settings);
    
    const nodesize = useStore(s => defaultSize(s, nodeid) );
    const mousePosition = flow.project(useGlobalMousePosition());

    
    
    const distance = calculateDistanceToEdges(mousePosition, nodesize);

    const connected = edges.reduce((acc, e) => e.sourceHandle == id || e.targetHandle == id || acc, false)

    const showHandles = distance < 100 || connected ? true : false;

    const svgString = renderToString(
        <FaArrowRight color="#FFFFFF"/>
    );
    
    const size = 6;

    const stylebase = {
        width: `${size * 2}px`,
        height: `${size * 2}px`,
        border: `2px solid ${settings.color}`,
        borderRadius: `2px`,
        paddingLeft: `2px`,
        backgroundImage: `url('data:image/svg+xml,${encodeURIComponent(svgString)}')`,
        backgroundSize: "contain",
        backgroundColor: settings.color,
        transition: `opacity 0.3s ease`,
        opacity: showHandles ? 1 : 0
    }

    const style = () => { 
        if (variant == "source") {
            return {
                transform: `translate(-100%, -125%)`,
                ...stylebase,
            }
        }

        if (variant == "control") {
            return {
                transform: `translate(-100%, 25%)`,
                ...stylebase,
            }
        }
        
        if (variant == "output") {
            return {
                right: `-${size * 3}px`,
                ...stylebase,
            }
        }

        return stylebase
    }



    return (
        <Handle type={type} id={id} position={position} style={style()} />
    )
}
