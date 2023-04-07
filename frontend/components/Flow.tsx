import React, {useState, useCallback, useContext, useRef } from 'react';
import ReactFlow, { MiniMap, ReactFlowProvider, Controls, Background, addEdge, Panel, useViewport } from 'reactflow';
import 'reactflow/dist/style.css';
import WindowNode from './Nodes/WindowNode'

import FABMenu from './FABMenu'
import { useAppSelector, useAppDispatch } from '@/util/hooks'
import { RootState } from '@/stores/store'
import { swrContext } from '@/util/swr';
import { setNodes, updateNodes, updateEdges, makeEdge, makeNode, removeWindow, setEdges } from "@/actions/windows";
import { StompContext } from './Stomp'
import ContextMenu from './Context/ContextMenu';

const nodeTypes = { windowNode: WindowNode };
const multiSelectionKeyCode = ["Meta", "Control", "Shift"]
const panOnDrag = [1]

function Flow() {

  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const session_id = useAppSelector((state) => state.activeSessionID.value);
  const userid = useAppSelector((state) => state.activeSessionID.userid);
  const bookmarks = useAppSelector((state: RootState) => state.bookmarker.value); 

  const { nodes, edges, logical_clock } = useAppSelector((state) => state.windows);

  const client = useContext(StompContext)
  const swr = useContext(swrContext);
  const { session } = swr.useSWRAbstract("session", `sessions/${session_id}`);
  const session_history_item = session?.history[0];
  const dispatch = useAppDispatch();

  if (session_history_item) {
    if (session_history_item.logical_clock > logical_clock) {
      let incomingNodes = []
      if (session_history_item.nodes) {
        incomingNodes = session_history_item.nodes;
      } else if (session_history_item.windows) {
        incomingNodes = session_history_item.windows;
      }

      let incomingEdges = []
      if (session_history_item.edges) {
        incomingEdges = session_history_item.edges;
      }

      dispatch(setNodes({
        nodes: incomingNodes,
        logical_clock: session_history_item.logical_clock
      }));

      dispatch(setEdges({
        edges: incomingEdges,
        logical_clock: session_history_item.logical_clock
      }));

    }
  }

    // this ref stores the current dragged node
    const dragRef = useRef(null);

    // target is the node that the node is dragged over
    const [target, setTarget] = useState(null);

  const onNodeDragStart = (evt, node) => {
    dragRef.current = node;
  };

  const onNodeDrag = (evt, node) => {
    // calculate the center point of the node from position and dimensions
    const centerX = node.position.x + node.width / 2;
    const centerY = node.position.y + node.height / 2;

    // find a node where the center point is inside
    const targetNode = nodes.find(
      (n) =>
        centerX > n.position.x &&
        centerX < n.position.x + n.width &&
        centerY > n.position.y &&
        centerY < n.position.y + n.height &&
        n.id !== node.id // this is needed, otherwise we would always find the dragged node
    );
    setTarget(targetNode);
  };

  const onNodeDragStop = (evt, node) => {
    if (node.data.type == "Document") {
      if (target) {
        if (target.data.type == "Group") {
          client.add_document_to_group(target.id.split("%")[0], node.id.split("%")[0]);
          dispatch(removeWindow(node.id));
        }
      }
    }

    if (node.data.type == "Cluster") {
      if (target) {
        if (target.data.type == "Group Palette") {
          client.copy_cluster(node.id.split("%")[0], session_id);
          dispatch(removeWindow(node.id));
        }
      }
    }
    
    
    setTarget(null);
    dragRef.current = null;
  };

  const onNodesChange = useCallback(
    (changes) => {
      dispatch(updateNodes(changes))
    }, []
  )

  const onEdgesChange = useCallback( 
    (changes) => {
      dispatch(updateEdges(changes))
    }, []
  )



  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const id = event.dataTransfer.getData('application/reactflow/id');
      const type = event.dataTransfer.getData('application/reactflow/type');

      // check if the dropped element is valid
      if (typeof id === 'undefined' || !id) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      const newNode = {
        id: id,
        // type: id.type,
        type: "windowNode",
        position,
        style : { 
          width: 400,
          height: 300,
        },
        data: { label: `${id} node`, i: id, type: type},

      };
      dispatch(makeNode({node: newNode}))
    },
    [reactFlowInstance]
  );


  interface MouseCoords {
    mouseX: number,
    mouseY: number,
    worldX: number,
    worldY: number
  }
  const [contextMenu, setContextMenu] = React.useState<MouseCoords | null>(null);
  const handleOpenContextMenu = (event) => {
    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = reactFlowInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    setContextMenu(
      contextMenu === null
        ? {
          mouseX: event.clientX + 2,
          mouseY: event.clientY - 6,
          worldX: position.x,
          worldY: position.y
        }
        : // repeated contextmenu when it is already open closes it with Chrome 84 on Ubuntu
        // Other native context menus might behave different.
        // With this behavior we prevent contextmenu from the backdrop to re-locale existing context menus.
        null,
    );

    

  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const onPaneContextMenu = (e) => {
    event.preventDefault();

    handleOpenContextMenu(e)
  }

  const onConnect = useCallback((connection, curredges) => {
    const newEdges = addEdge(connection, [])
    dispatch(makeEdge({edges: newEdges}))


    const alledges = addEdge(connection, curredges)
    client.update_edges(alledges)
}, []);
  
const FABWrapper = () => {
  var coords = {x: 0, y: 0, width: 1}
  if (reactFlowInstance) {
    const vp = reactFlowInstance.project({x: 100, y: 100})
    coords.x = vp.x;
    coords.y = vp.y;
  }
  return <FABMenu windata={{x: coords.x, y: coords.y, width: 1}}/>
  
}
  
  return (
    <div className="providerflow">
      <ReactFlowProvider>
      
      <div className="reactflow-wrapper" ref={reactFlowWrapper} style={{width: "100vw", height: "90vh"}}>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        panOnScroll={true}
        selectionOnDrag={true}
        panOnDrag={panOnDrag}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onConnect={(connection) => onConnect(connection, edges)}
        onInit={setReactFlowInstance}
        multiSelectionKeyCode={multiSelectionKeyCode}
        onClick={() => client.save_UI_state(session_id, bookmarks, nodes, edges)}
        onNodeDrag={onNodeDrag}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onPaneContextMenu={onPaneContextMenu}

      >
        <Background />
        <MiniMap zoomable pannable />
        <Controls />
        <Panel position="top-left" style={{margin: "2em"}}><FABWrapper /></Panel>

      </ReactFlow>
      <ContextMenu
        handleCloseContextMenu={handleCloseContextMenu}
        contextMenu={contextMenu}
      /> 
      </div>
      
      </ReactFlowProvider>
      </div>
  );
}

export default Flow;