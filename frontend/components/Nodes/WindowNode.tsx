import { useCallback, memo } from 'react';
import { Handle, Position, useStore } from 'reactflow';
import WindowFactory from '../WindowFolder/WindowFactory';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';

function WindowNode({ data, id, selected }) {

  const size = useStore((s) => {
    const node = s.nodeInternals.get(id);
  
    return {
      width: node.width,
      height: node.height,
    };
  });


  if (data.type == "Document") {
    return (
      <>
        <NodeResizer color="#ff0071" isVisible={selected} minWidth={100} minHeight={30}   />
        <WindowFactory id={data.i} size={size} windata={data} />
        <Handle type="source" position={Position.Right} id="a" />

      </>
    );
  }

  if (data.type == "Teleoscope") {
    return (
      <>
        <NodeResizer color="#ff0071" isVisible={selected} minWidth={100} minHeight={30}   />
        <WindowFactory id={data.i} size={size} windata={data} />
        <Handle type="source" position={Position.Left} id="a" />

      </>
    );
  }

  return (
    <>
        
      <NodeResizer color="#ff0071" isVisible={selected} minWidth={100} minHeight={30}   />
      <WindowFactory id={data.i} size={size} windata={data} /> 

  
    </>
  );
}


export default memo(WindowNode);
