// FlowWrapper.jsx
import React from 'react';
import ReactFlow from 'reactflow';

const FlowWrapper = ({
  nodes, 
  edges, 
  tempEdges, 
  nodeTypes, 
  onNodesChange, 
  onEdgesChange, 
  onDragOver, 
  onDrop, 
  onConnect,
  onInit,
  onClick,
  onNodeDrag,
  onNodeDragStart,
  onNodeDragStop,
  onPaneContextMenu,
  onSelectionChange,
  children
}) => {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges.concat(tempEdges)}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      panOnScroll={true}
      selectionOnDrag={true}
      panOnDrag={[1]}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onConnect={(connection) => onConnect(connection, edges)}
      onInit={onInit}
      multiSelectionKeyCode={["Meta", "Control", "Shift"]}
      disableKeyboardA11y={true}
      onClick={onClick}
      onNodeDrag={onNodeDrag}
      onNodeDragStart={onNodeDragStart}
      onNodeDragStop={onNodeDragStop}
      onPaneContextMenu={onPaneContextMenu}
      onSelectionChange={onSelectionChange}
    >
      {children}
    </ReactFlow>
  );
};

export default FlowWrapper;
