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

<<<<<<< HEAD
=======
  const windata = {...data, ...size}
>>>>>>> pb_flow

  if (data.type == "Document") {
    return (
      <>
<<<<<<< HEAD
        <NodeResizer color="#ff0071" isVisible={selected} minWidth={100} minHeight={30}   />
        <WindowFactory id={data.i} size={size} windata={data} />
        <Handle type="source" position={Position.Right} id="a" />
=======
        <NodeResizer color="#ff0071" isVisible={selected} minWidth={windata.minWidth} minHeight={windata.minHeight}   />
        <WindowFactory id={data.i} size={size} windata={ windata } />
        <Handle type="source" position={Position.Right} id="a" isConnectable={true}/>
>>>>>>> pb_flow

      </>
    );
  }

  if (data.type == "Teleoscope") {
    return (
      <>
<<<<<<< HEAD
        <NodeResizer color="#ff0071" isVisible={selected} minWidth={100} minHeight={30}   />
        <WindowFactory id={data.i} size={size} windata={data} />
        <Handle type="source" position={Position.Left} id="a" />
=======
        <NodeResizer color="#ff0071" isVisible={selected} minWidth={windata.minWidth} minHeight={windata.minHeight}   />
        <WindowFactory id={data.i} size={size} windata={ windata } />
        <Handle type="target" position={Position.Left} id="b" isConnectable={true} />
>>>>>>> pb_flow

      </>
    );
  }

  return (
    <>
        
<<<<<<< HEAD
      <NodeResizer color="#ff0071" isVisible={selected} minWidth={100} minHeight={30}   />
      <WindowFactory id={data.i} size={size} windata={data} /> 
=======
      <NodeResizer color="#ff0071" isVisible={selected} minWidth={windata.minWidth} minHeight={windata.minHeight}   />
      <WindowFactory id={data.i} size={size} windata={ windata } /> 
>>>>>>> pb_flow

  
    </>
  );
}


export default memo(WindowNode);
