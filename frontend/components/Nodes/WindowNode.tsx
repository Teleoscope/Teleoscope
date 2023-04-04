import { useCallback, memo } from 'react';
import { Handle, Position, useStore } from 'reactflow';
import WindowFactory from '../WindowFolder/WindowFactory';
import { NodeResizer } from '@reactflow/node-resizer';
import { useAppSelector, useAppDispatch } from '../../hooks'
import '@reactflow/node-resizer/dist/style.css';

function WindowNode({ data, id, selected }) {
  const { nodes, edges, logical_clock } = useAppSelector((state) => state.windows);

  const size = useStore((s) => {
    const node = s.nodeInternals.get(id);
    // const saved = nodes.find(n => n.id == id)
    return {
      x: node.positionAbsolute.x,
      y: node.positionAbsolute.y,
      width: node.width,
      height: node.height,
      minHeight: 35,
      minWidth: 60
    };
  });

  const windata = {...data, ...size}

  if (data.type == "Document" || data.type == "Group") {
    return (
      <>
        <NodeResizer color="#ff0071" isVisible={selected} minWidth={windata.minWidth} minHeight={windata.minHeight}   />
        <WindowFactory id={data.i} size={size} windata={ windata } />
        <Handle type="source" position={Position.Right} id={data.i} isConnectable={true}/>

      </>
    );
  }


  if (data.type == "Teleoscope") {
    return (
      <>
        <NodeResizer color="#ff0071" isVisible={selected} minWidth={windata.minWidth} minHeight={windata.minHeight}   />
        <WindowFactory id={data.i} size={size} windata={ windata } />
        <Handle type="target" position={Position.Left} id={data.i} isConnectable={true} />

      </>
    );
  }

  return (
    <>
        
      <NodeResizer color="#ff0071" isVisible={selected} minWidth={windata.minWidth} minHeight={windata.minHeight}   />
      <WindowFactory id={data.i} size={size} windata={ windata } /> 

  
    </>
  );
}


export default memo(WindowNode);
