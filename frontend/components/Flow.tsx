import React, { useMemo, useState, useCallback, useContext, useRef, useEffect } from "react";
import { addEdge } from "reactflow";
import { useAppSelector, useAppDispatch, useWindowDefinitions } from "@/util/hooks";
import { RootState } from "@/stores/store";
import { useSWRHook } from "@/util/swr";
import {
  updateNodes,
  updateEdges,
  makeEdge,
  makeNode,
  removeWindow,
  setSelection,
} from "@/actions/windows";
import { useStomp } from "@/components/Stomp";
import FlowProviderWrapper from "@/components/FlowProviderWrapper";
import FlowWrapper from "@/components/FlowWrapper";
import FlowUIComponents from "@/components/FlowUIComponents";
import ContextMenuHandler from "@/components/ContextMenuHandler";
import FlowFABWrapper from "@/components/FlowFABWrapper";
import "reactflow/dist/style.css";
import styles from "@/styles/flow.module.css";
import lodash from 'lodash';
import { setNodes, setEdges, setColor } from "@/actions/windows";
import { loadBookmarkedDocuments } from "@/actions/windows";
import WindowNode from "@/components/Nodes/WindowNode";
import ButtonEdge from "@/components/Nodes/ButtonEdge";
import { findTargetNode, getClosestEdge } from "@/util/drag";

interface MouseCoords {
  mouseX: number;
  mouseY: number;
  worldX: number;
  worldY: number;
} 

function Flow(props) {
  const wdefs = useWindowDefinitions();
  const nodeTypes = useMemo(() => ({ windowNode: WindowNode, ...wdefs.nodeTypeDefs()}), []);
  const edgeTypes = useMemo(() => ({default: ButtonEdge}), []);

  const client = useStomp();

  const swr = useSWRHook();
  
  // this ref stores the current reactflow ref in the DOM
  const reactFlowWrapper = useRef(null);
  
  // this ref stores the current dragged node
  const dragRef = useRef(null);
  
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [tempEdges, setTempEdges] = useState([]);

  // target is the node that the node is dragged over
  const [target, setTarget] = useState(null);
  const [contextMenu, setContextMenu] = useState<MouseCoords | null>(
    null
  );
  const session_id = useAppSelector((state) => state.activeSessionID.value);
  const userid = useAppSelector((state) => state.activeSessionID.userid);
  const bookmarks = useAppSelector((state: RootState) => state.windows.bookmarks);

  const settings = useAppSelector((state) => state.windows.settings);

  const { nodes, edges, logical_clock } = useAppSelector((state) => state.windows);

  const { session } = swr.useSWRAbstract("session", `sessions/${session_id}`);
  const session_history_item = session?.history[0];

  const dispatch = useAppDispatch();


  useEffect(() => {
    
    if (session_history_item) {
      if (session_history_item.logical_clock > logical_clock) {
        let incomingNodes = [];
        if (session_history_item.nodes) {
          incomingNodes = session_history_item.nodes;
        } else if (session_history_item.windows) {
          incomingNodes = session_history_item.windows;
        }
    
        let incomingEdges = [];
        if (session_history_item.edges) {
          incomingEdges = session_history_item.edges;
        }
    
        dispatch(
          setNodes({
            nodes: incomingNodes,
            logical_clock: session_history_item.logical_clock,
          })
        );
    
        dispatch(
          setEdges({
            edges: incomingEdges,
            logical_clock: session_history_item.logical_clock,
          })
        );
    
        dispatch(
          setColor({
            client: client,
            session_id: session_id,
            color: session_history_item.color,
          })
        );
    
        dispatch(loadBookmarkedDocuments(session_history_item.bookmarks));
      }
    }
  }, [session, session_history_item, logical_clock, userid]);
  
  const handleTarget = node => {
    setTarget(findTargetNode(node, nodes));
  }

  const make_connection = (edge) => {
    return {
      source: edge.source,
      sourceHandle: edge.source,
      target: edge.target,
      targetHandle: edge.target
    }
  }


  const onNodeDragStop = (evt, node) => {
    if (node?.data?.type == "Document") {
      if (target) {
        if (target.data.type == "Group") {
          client.add_document_to_group(
            target.id.split("%")[0],
            node.id.split("%")[0]
          );
          dispatch(removeWindow(node.id));
        }
      }
    }

    if (node?.data?.type == "Document" || node?.data?.type == "Note" || node?.data.type == "Group") {
      if (tempEdges.length == 1 && tempEdges[0] != null) {
        const connection = make_connection(tempEdges[0])
        create_edge(connection, edges)
        setTempEdges([])
      }
    }

    if (node?.data?.type == "Cluster") {
      if (target) {
        if (target.data.type == "Groups") {
          client.copy_cluster(node.id.split("%")[0], session_id);
          dispatch(removeWindow(node.id));
        }
      }
    }

    setTarget(null);
    dragRef.current = null;
  };

  const onNodesChange = useCallback((changes) => {
    dispatch(updateNodes(changes));
  }, []);

  const onEdgesChange = useCallback((changes) => {
    dispatch(updateEdges(changes));
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onNodeDragStart = (evt, node) => { dragRef.current = node };


  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const id = event.dataTransfer.getData("application/reactflow/id");
      const type = event.dataTransfer.getData("application/reactflow/type");

      // check if the dropped element is valid
      if (typeof id === "undefined" || !id) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      dispatch(makeNode({
        client: client,
        oid   : id,
        type  : type,
        width : settings.default_document_width,
        height: settings.default_document_height,
        x     : position.x,
        y     : position.y
      }));
    },
    [reactFlowInstance, settings]
  );

  

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
            worldY: position.y,
          }
        : // repeated contextmenu when it is already open closes it with Chrome 84 on Ubuntu
          // Other native context menus might behave different.
          // With this behavior we prevent contextmenu from the backdrop to re-locale existing context menus.
          null
    );
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const onPaneContextMenu = (e) => {
    event.preventDefault();
    handleOpenContextMenu(e);
  };  

  const create_edge = (connection, curredges) => {
    const newEdges = addEdge(connection, []);
    dispatch(makeEdge({
      client: client,
      connection: connection,
      edges: newEdges
    }));
  }

  const onConnect = useCallback((connection, curredges) => {
      create_edge(connection, curredges)
  }, [client]);

  const onSelectionChange = useCallback(({ nodes, edges }) => {
    dispatch(setSelection({ nodes: nodes, edges: edges }));
  }, []);

  const onNodeDrag =  useCallback((evt, node) => {
    if (
        node?.data.type == "Document" || 
        node?.data.type == "Note"     || 
        node?.data.type == "Group"
      ) {
      handleTarget(node);
      handleTempEdge(evt, node);  
    }
  }, [getClosestEdge, setTempEdges]);

  const handleTempEdge = (_, node) => {
      const closeEdge = getClosestEdge(node, nodes, edges);
      if (closeEdge) {
        closeEdge.className = styles.temp
      }
      setTempEdges([closeEdge])
    }

    const throttledSave = useRef(
      lodash.throttle((client, sessionId, bookmarks, nodes, edges) => {
        client.save_UI_state(sessionId, bookmarks, nodes, edges);
      }, 5000)  // waits 5000 ms after the last call
    ).current;
    
    const handleOnClick = () => {
      throttledSave(client, session_id, bookmarks, nodes, edges)
    }

    useEffect(() => {
      return () => {
        throttledSave.cancel();
      };
    }, []);

  
  

  return (
    <div className="providerflow">
      <FlowProviderWrapper>
        <div
          className="reactflow-wrapper"
          ref={reactFlowWrapper}
          style={{ width: `calc(100% - ${props.drawerWidth})`, height: "97vh" }}
        >
          <FlowWrapper
            nodes={nodes}
            edges={edges}
            tempEdges={tempEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onClick={handleOnClick}
            onNodeDrag={onNodeDrag}
            onNodeDragStart={onNodeDragStart}
            onNodeDragStop={onNodeDragStop}
            onPaneContextMenu={onPaneContextMenu}
            onSelectionChange={onSelectionChange}
          >
            <FlowUIComponents
              fabWrapper={
                <FlowFABWrapper reactFlowInstance={reactFlowInstance} />
              }
            />
          </FlowWrapper>
          <ContextMenuHandler
            handleCloseContextMenu={handleCloseContextMenu}
            contextMenu={contextMenu}
          />
        </div>
      </FlowProviderWrapper>
    </div>
  );
}

export default Flow;
