import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { EdgeChange, Node, NodeChange, addEdge } from 'reactflow';
import { ReactFlowProvider } from 'reactflow';
import { MiniMap, Controls, Background, Panel } from 'reactflow';

import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { updateNodes, updateEdges, makeEdge, setSelection, toggleMinMax, dropNode } from '@/actions/appState';
import FlowWrapper from '@/components/Flow/FlowWrapper';
import ContextMenuHandler from '@/components/ContextMenuHandler';
import FlowFABWrapper from '@/components/Flow/FlowFABWrapper';
import 'reactflow/dist/style.css';
import lodash from 'lodash';
import { addDocumentToGroup, copyCluster } from '@/actions/appState';
import WindowNode from '@/components/Nodes/WindowNode';
import ButtonEdge from '@/components/Nodes/ButtonEdge';
import { findTargetNode, getClosestEdge } from '@/lib/drag';
import axios from 'axios';
import { WindowConfig } from '../WindowFolder/WindowDefinitions';

interface MouseCoords {
    mouseX: number;
    mouseY: number;
    worldX: number;
    worldY: number;
}


const nodeTypeDefs = () => Object.entries(WindowConfig).reduce((obj, [w, def]) => {
      obj[w] = def.nodetype;
      return obj;
    })

function Workflow({ drawerWidth }: { drawerWidth: number }) {

    
    const nodeTypes = useMemo(
        () => ({ windowNode: WindowNode, ...nodeTypeDefs() }),
        []
    );
    const edgeTypes = useMemo(() => ({ default: ButtonEdge }), []);

    const dispatch = useAppDispatch();

    // this ref stores the current reactflow ref in the DOM
    const reactFlowWrapper = useRef(null);

    // this ref stores the current dragged node
    const dragRef = useRef(null);

    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [tempEdges, setTempEdges] = useState([]);

    // target is the node that the node is dragged over
    const [target, setTarget] = useState<Node | null>(null);
    const [contextMenu, setContextMenu] = useState<MouseCoords | null>(null);
    
    const {
        _id: workflow_id,
        nodes,
        edges,
        settings,
        bookmarks
    } = useAppSelector((state) => state.appState.workflow);


    const { workspace, workflow
    } = useAppSelector((state) => state.appState);
    
    const onNodeDragStop = (evt: DragEvent, node: Node) => {
        if (node?.data?.type == 'Document') {
            if (target) {
                if (target.data.type == 'Group') {
                    dispatch(
                        addDocumentToGroup({
                            group_id: target.id,
                            document_id: node.id
                        })
                    )
                }
            }
        }

        if (node?.data?.type == 'Cluster') {
            if (target) {
                if (target.data.type == 'Groups') {
                    dispatch(
                        copyCluster({
                            graph_id: node.id.split('%')[0],
                            workflow_id: workflow_id
                        })
                    ); // TODO: ADD index here
                    dispatch(updateNodes({
                        changes: [
                          {
                            id: node.id,
                            type: "remove"
                          }
                        ]
                }))

                }
            }
        }

        setTarget(null);
        dragRef.current = null;
    };

    const onNodesChange = useCallback((changes: NodeChange[]) => {
        dispatch(updateNodes({ changes: changes }));
    }, []);

    const onEdgesChange = useCallback((changes: EdgeChange[]) => {
        dispatch(updateEdges({ changes: changes }));
    }, []);

    const onDragOver = useCallback((event: DragEvent) => {
        if (event) {
            if (event.dataTransfer) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
            }
        }
    }, []);

    const onNodeDragStart = (event: Event, node: Node) => {
        dragRef.current = node;
    };

    const onNodeDoubleClick = useCallback((event: Event, node: Node) => {
        dispatch(toggleMinMax(node.id));
    }, []);

    const onDrop = useCallback(
        (event) => {
            event.preventDefault();
            const id = event.dataTransfer.getData('application/reactflow/id');
            const type = event.dataTransfer.getData(
                'application/reactflow/type'
            );
            const index = event.dataTransfer.getData(
                'application/reactflow/index'
            );

            // check if the dropped element is valid
            if (typeof id === 'undefined' || !id) {
                return;
            }

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY
            });

            dispatch(
                dropNode({
                    oid: id,
                    type: type,
                    width: workspace.settings?.document_width,
                    height: workspace.settings?.document_height,
                    x: position.x,
                    y: position.y,
                    index: index
                })
            );
        },
        [reactFlowInstance, settings]
    );

    const handleCloseContextMenu = () => setContextMenu(null);
    const onPaneContextMenu = (event: Event) => handleOpenContextMenu(event);
    const handleOpenContextMenu = (event) => {
        event.preventDefault();
        const position = reactFlowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY
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
                  null
        );
    };

    const create_edge = (connection, curredges) => {
        const newEdges = addEdge(connection, []);
        dispatch(
            makeEdge({
                connection: connection,
                edges: newEdges
            })
        );
    };

    const isValidConnection = (connection) => {
        const source = nodes.find((n) => n.id == connection.source);
        const target = nodes.find((n) => n.id == connection.target);

        if (source && target) {
            if (source.type == 'Note' && target.type == 'Projection') {
                return false;
            }

            if (
                source.type == 'Search' &&
                target.type == 'Projection' &&
                connection.targetHandle.split('_').slice(-1)[0] === 'control'
            ) {
                return false;
            }
            // add other conditions if needed
            return true;
        }

        return false;
    };

    const onConnect = useCallback((connection, curredges) => {
        create_edge(connection, curredges);
    }, []);

    const onSelectionChange = useCallback(({ nodes, edges }) => {
        dispatch(setSelection({ nodes: nodes, edges: edges }));
    }, []);

    const onNodeDrag = useCallback(
        (evt, node) => {
            if (
                node?.data.type == 'Document' ||
                node?.data.type == 'Note' ||
                node?.data.type == 'Group'
            ) {
                setTarget(findTargetNode(node, nodes));
                handleTempEdge(evt, node);
            }
        },
        [getClosestEdge, setTempEdges, nodes]
    );

    const handleTempEdge = (_, node) => {
        // const closeEdge = getClosestEdge(node, nodes, edges);
        // if (closeEdge) {
        //   closeEdge.className = styles.temp
        // }
        // setTempEdges([closeEdge])
    };

    const throttledSave = useRef(
        lodash.throttle((wf) => {
            const post_result = axios.post(`/api/workflow`, 
                wf
            )
        }, 5000) // waits 5000 ms after the last call
    ).current;

    const handleOnClick = () => {
        throttledSave(workflow);
    };

    useEffect(() => {
        return () => {
            throttledSave.cancel();
        };
    }, []);

    return (
        <div className="providerflow">
            <ReactFlowProvider>
                <div
                    className="reactflow-wrapper"
                    ref={reactFlowWrapper}
                    style={{
                        width: `calc(100% - ${drawerWidth})`,
                        height: '97vh'
                    }}
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
                        isValidConnection={isValidConnection}
                        onNodeDoubleClick={onNodeDoubleClick}
                    >
                        <Background />
                        <MiniMap zoomable pannable />
                        <Controls />
                        <Panel position="top-left" style={{ margin: '2em' }}>
                            <FlowFABWrapper
                                reactFlowInstance={reactFlowInstance}
                            />
                        </Panel>
                    </FlowWrapper>
                    <ContextMenuHandler
                        handleCloseContextMenu={handleCloseContextMenu}
                        contextMenu={contextMenu}
                    />
                </div>
            </ReactFlowProvider>
        </div>
    );
}

export default Workflow;
