import { useState, useCallback, useRef } from "react";
import { Stack, Typography } from "@mui/material";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "reactflow";
import { setSelection } from "@/actions/windows";
import { useAppDispatch } from "@/util/hooks";
export default function ExampleFlow(props) {
    const reactFlowWrapper = useRef(null);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const dispatch = useAppDispatch();

    const [nodes, setNodes] = useState(props.nodes);
    const [edges, setEdges] = useState(props.edges);

    const onNodesChange = useCallback(
      (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
      [setNodes]
    );
    const onEdgesChange = useCallback(
      (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
      [setEdges]
    );
    const onDragOver = useCallback((event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }, []);

    const onSelectionChange = useCallback(({ nodes, edges }) => {
      dispatch(setSelection({ nodes: nodes, edges: edges }));
    }, []);

    const onDrop = useCallback(
      (event) => {
        event.preventDefault();
        const id = event.dataTransfer.getData("application/reactflow/id");
        const type = event.dataTransfer.getData("application/reactflow/type");

        // check if the dropped element is valid
        if (typeof id === "undefined" || !id) {
          return;
        }

        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        const newNode = {
          id: id,
          // type: id.type,
          type: "windowNode",
          position,
          style: {
            width: 150,
            height: 34,
          },
          data: { label: `${id} node`, i: id, type: type },
        };
        setNodes((nodes) => nodes.concat(newNode));
      },
      [reactFlowInstance]
    );

    const onConnect = useCallback(
      (params) => {
        const newedges = addEdge(params, edges);
        setEdges(newedges);
        if (props.onConnectCallback) {
          props.onConnectCallback(newedges);
        }
      },
      [edges]
    );

    return (
      <Stack sx={{ width: props.width, height: exampleHeight }}>
        <Typography variant="overline" display="block" gutterBottom>
          {props.label}
        </Typography>
        <div
          className="reactflow-wrapper"
          ref={reactFlowWrapper}
          style={{
            height: "100%",
            border: "1px solid #D3D3D3",
            marginTop: "10px",
          }}
        >
          <ReactFlow
            onInit={setReactFlowInstance}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            panOnDrag={props.panOnDrag}
            panOnScroll={false || props.panOnScroll}
            zoomOnScroll={props.zoomOnScroll}
            zoomOnPinch={false || props.zoomOnPinch}
            zoomOnDoubleClick={false || props.zoomOnDoubleClick}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onSelectionChange={onSelectionChange}
            onConnect={onConnect}
          >
            <Background></Background>
            {props.minimap ? <MiniMap zoomable pannable /> : <></>}
            {props.controls ? <Controls /> : <></>}
          </ReactFlow>
        </div>
      </Stack>
    );
  }