import { useCallback, memo } from 'react';
import { Handle, Position, useStore } from 'reactflow';
import WindowFactory from '../WindowFolder/WindowFactory';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';

function WindowNode({ data, id, selected }) {

  const size = useStore((s) => {
    const node = s.nodeInternals.get(id);
  
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

  if (data.type == "Document") {
    return (
      <>
        <NodeResizer color="#ff0071" isVisible={selected} minWidth={windata.minWidth} minHeight={windata.minHeight}   />
        <WindowFactory id={data.i} size={size} windata={ windata } />
        <Handle type="source" position={Position.Right} id="a" isConnectable={true}/>

      </>
    );
  }

  if (data.type == "Teleoscope") {
    return (
      <>
        <NodeResizer color="#ff0071" isVisible={selected} minWidth={windata.minWidth} minHeight={windata.minHeight} lineStyle={{thickness:"10px"}}  />
        <WindowFactory id={data.i} size={size} windata={ windata } />
        <Handle type="target" position={Position.Left} id="b" isConnectable={true} />

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
