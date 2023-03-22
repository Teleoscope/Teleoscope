import { React, useState, useMemo, useCallback } from 'react';
import ReactFlow, { Controls, Background, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import 'reactflow/dist/style.css';
import SearchNode from './Nodes/SearchNode'
import WindowNode from './Nodes/WindowNode'
import { useAppSelector, useAppDispatch } from '../hooks'
import { RootState } from '../stores/store'
import WindowFactory from './WindowFolder/WindowFactory';
import useSWRAbstract from '../util/swr';
import { loadWindows, setDefault, setLogicalClock, setNodes, updateNodes, setEdges } from "../actions/windows";
import { loadBookmarkedDocuments } from "../actions/bookmark";

const nodeTypes = { windowNode: WindowNode };


const initialEdges = [{ id: '1-2', source: '1', target: '2', label: 'to the', type: 'step' }];

const multiSelectionKeyCode = ["Meta", "Control", "Shift"]



function Flow() {
  const session_id = useAppSelector((state) => state.activeSessionID.value);
  const { nodes, edges, logical_clock } = useAppSelector((state) => state.windows);

  const { session } = useSWRAbstract("session", `/api/sessions/${session_id}`);
  const session_history_item = session?.history[0];
  const dispatch = useAppDispatch();

  const transformNodes = (windows) => windows.map((w) => {
    return {
      id: w.i,
      data: {label: w.i, ...w},
      position: {x: w.x, y: w.y},
      style : { 
        width: 400,
        height: 300,
      },
      type: "windowNode"
    }})

    

  if (session_history_item) {
    if (session_history_item.logical_clock > logical_clock) {
      let temp = []
      if (session_history_item.nodes) {
        temp = nodes;
      } else {
        temp = transformNodes(session_history_item.windows)
      }

      dispatch(setNodes({
        nodes: temp,
        logical_clock: session_history_item.logical_clock
      }));
    }
  }

  const onNodesChange = useCallback(
    (changes) => {
      console.log("debug nodes change", changes)
      dispatch(updateNodes(changes))
    }, []
  )
 

  const onEdgesChange = useCallback( (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),[] );
  
  console.log("debug", nodes, session_history_item)
  return (
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}

        multiSelectionKeyCode={multiSelectionKeyCode}
        
      >
        <Background />
        <Controls />
      </ReactFlow>
  );
}

export default Flow;