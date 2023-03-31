import { React, useState, useMemo, useCallback, useRef } from 'react';
import ReactFlow, { ReactFlowProvider, Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';
import SearchNode from './Nodes/SearchNode'
import WindowNode from './Nodes/WindowNode'
import { useAppSelector, useAppDispatch } from '../hooks'
import { RootState } from '../stores/store'
import useSWRAbstract from '../util/swr';
import { setNodes, updateNodes, updateEdges, setEdges, makeEdge, addNode } from "../actions/windows";
import { Stomp } from './Stomp'

const nodeTypes = { windowNode: WindowNode };
const multiSelectionKeyCode = ["Meta", "Control", "Shift"]
const panOnDrag = [1,2]

function Flow() {
  

  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const session_id = useAppSelector((state) => state.activeSessionID.value);
  const userid = useAppSelector((state) => state.activeSessionID.userid);
  const bookmarks = useAppSelector((state: RootState) => state.bookmarker.value); 

  const { nodes, edges, logical_clock } = useAppSelector((state) => state.windows);

  const client = Stomp.getInstance();
  client.userId = userid;

  const { session } = useSWRAbstract("session", `/api/sessions/${session_id}`);
  const session_history_item = session?.history[0];
  const dispatch = useAppDispatch();

  

  if (session_history_item) {
    if (session_history_item.logical_clock > logical_clock) {
      let temp = []
      if (session_history_item.nodes) {
        temp = nodes;
      } else {
        temp = session_history_item.windows
      }

      dispatch(setNodes({
        nodes: temp,
        logical_clock: session_history_item.logical_clock
      }));
    }
  }


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
      dispatch(addNode({node: newNode}))
    },
    [reactFlowInstance]
  );

  const onConnect = useCallback((params) => dispatch(makeEdge({params: params})));
  
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
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        multiSelectionKeyCode={multiSelectionKeyCode}
        fitView
        onClick={() => client.save_UI_state(session_id, bookmarks, nodes)}
      >
        <Background />
        <Controls />
      </ReactFlow>
      </div>
      </ReactFlowProvider>
      </div>
  );
}

export default Flow;