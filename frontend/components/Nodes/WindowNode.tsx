import { useCallback, memo } from 'react';
import { Handle, Position  } from 'reactflow';
import WindowFactory from '../WindowFolder/WindowFactory';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';

function WindowNode({ data, selected }) {

  return (
    <>
        
      <NodeResizer color="#ff0071" isVisible={selected} minWidth={100} minHeight={30}   />
      <Handle type="target" position={Position.Top} />
      <WindowFactory id={data.i} windata={data} /> 
      <Handle type="source" position={Position.Bottom} id="a" />
  
    </>
  );
}


export default memo(WindowNode);
