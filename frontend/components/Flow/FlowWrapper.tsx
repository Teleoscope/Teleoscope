import ReactFlow from 'reactflow';
import ConnectionLine from '@/components/Nodes/ConnectionLine';

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
  isValidConnection,
  onNodeDoubleClick,
  edgeTypes,
  children

}) => {


  return (
    <ReactFlow
      nodes={nodes}
      edges={edges.concat(tempEdges)}
      edgeTypes={edgeTypes}
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
      connectionLineComponent={ConnectionLine}
      isValidConnection={isValidConnection}
      onNodeDoubleClick={onNodeDoubleClick}
      zoomOnDoubleClick={false}

    >
      {children}
    </ReactFlow>
  );
};

export default FlowWrapper;
