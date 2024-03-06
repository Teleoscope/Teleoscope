import React, { useRef, useState, useCallback } from "react";

import { Provider } from "react-redux";
import { SWRConfig } from "swr";
import "reactflow/dist/style.css";
import { useAppDispatch } from "@/util/hooks";
import { Box, Stack, Typography } from "@mui/material";
// store
import { demoStore } from "@/stores/store";

import Bookmarks from "@/components/Bookmarks";

import { SWR, swrContext } from "@/util/swr";
import { Stomp, StompContext } from "@/util/Stomp";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "reactflow";
import { setSelection } from "@/actions/windows";
import WindowNode from "@/components/Nodes/WindowNode";
import SelectionViewer from "@/components/Sidebar/SelectionViewer";
import {
  account_fights_teleoscope,
  blocking_doc,
  blocking_teleoscope,
  taking_doc,
  taking_teleoscope,
} from "@/components/Demo/demoTeleoscopes";
import WindowDefinitions from "../WindowFolder/WindowDefinitions";
// API fetcher for SWR global config
//const fetcher = (...args: Parameters<typeof fetch>) => fetch(...args).then((res) => res.json())
const fetcher = (...args) => fetch(...args).then((res) => res.json());

const wdefs = new WindowDefinitions({settings: {color: "#D3D3D3"}})
const nodeTypes = { windowNode: WindowNode, ...wdefs.nodeTypeDefs()}
  
export default function Demo(props) {
  const mySWR = new SWR("aita");
  const client = Stomp.getFakeClient();
  const reactFlowWrapper = useRef(null);
  const exampleHeight = "450px";

  const searchNode = {
    id: "%search",
    type: "Search",
    position: {
      x: 25,
      y: 25,
    },
    style: {
      width: 300,
      height: 300,
    },
    data: {
      label: "%search node",
      i: "%search",
      type: "Search",
    },
    width: 300,
    height: 300,
    selected: false,
    positionAbsolute: {
      x: 0,
      y: 0,
    },
    dragging: false,
    draggable: false,
    // selectable: fa
  };

  const Providers = (props) => {
    return (
      <SWRConfig
        value={{
          fetcher: fetcher,
          errorRetryCount: 10,
          refreshInterval: 250,
        }}
      >
        <Provider store={demoStore}>
          <swrContext.Provider value={mySWR}>
            <StompContext.Provider value={client}>
              {props.children}
            </StompContext.Provider>
          </swrContext.Provider>
        </Provider>
      </SWRConfig>
    );
  };

  const ExampleFlow = (props) => {
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
  };

  if (props.type == "Search") {
    const nodes = [searchNode];
    return (
      <Providers>
        <Stack direction="row">
          <ExampleFlow
            label="Search"
            width="48%"
            nodes={nodes}
            edges={[]}
            panOnDrag={false}
            zoomOnScroll={false}
          ></ExampleFlow>
          <Box sx={{ flexGrow: 1, flexDirection: "row" }}></Box>

          <Stack sx={{ width: "48%", height: exampleHeight }}>
            <Typography variant="overline" display="block" gutterBottom>
              Document reader
            </Typography>
            <Box
              sx={{
                marginTop: "10px",
                height: "100%",
                border: "1px solid #D3D3D3",
                overflow: "auto",
              }}
            >
              <SelectionViewer
                noGroup={true}
                noTeleoscope={true}
              ></SelectionViewer>
            </Box>
          </Stack>
        </Stack>
      </Providers>
    );
  }

  if (props.type == "Bookmarks") {
    const nodes = [searchNode];
    return (
      <Providers>
        <Stack direction="row">
          <ExampleFlow
            label="Search"
            width="48%"
            nodes={nodes}
            edges={[]}
            panOnDrag={false}
            zoomOnScroll={false}
          ></ExampleFlow>
          <Box sx={{ flexGrow: 1, flexDirection: "row" }}></Box>
          <Stack sx={{ width: "48%", height: exampleHeight }}>
            <Typography variant="overline" display="block" gutterBottom>
              Bookmarks
            </Typography>
            <Box
              sx={{
                marginTop: "10px",
                height: "100%",
                border: "1px solid #D3D3D3",
                overflow: "auto",
              }}
            >
              <Bookmarks></Bookmarks>
            </Box>
          </Stack>
        </Stack>
      </Providers>
    );
  }

  const group = {
    _id: "63e19649a01492f13f86f4d0",
    creation_time: "2023-02-07T00:07:37.525Z",
    teleoscope: "63e19649a01492f13f86f4cf",
    history: [
      {
        timestamp: "2023-02-07T00:07:56.752Z",
        color: "#ecef32",
        included_documents: [
          "637f472189a5c102c6b3a483",
          "637f6542b4b0ff51b395d612",
          "637fa68bafe39393a0325b49",
          "637f33096e9ac92a03572a17",
        ],
        label: "Wifi problems",
        action: "Add document to group",
        user: "637ee569d1259b1565f7e97e",
      },
    ],
  };

  const groupNode = {
    id: "%group",
    type: "Group",
    position: {
      x: 25,
      y: 25,
    },
    style: {
      width: 300,
      height: 300,
    },
    data: {
      label: "%group node",
      i: "%group",
      type: "Group",
      demo: true,
      demodata: {
        data: group,
        group: group,
      },
    },
    width: 300,
    height: 300,
    selected: false,
    positionAbsolute: {
      x: 0,
      y: 0,
    },
    dragging: false,
    draggable: false,
    connectable: false,
  };

  if (props.type == "Groups") {
    const nodes = [groupNode];
    return (
      <Providers>
        <Stack direction="row">
          <ExampleFlow
            label="Search"
            width="48%"
            nodes={nodes}
            edges={[]}
            panOnDrag={false}
            zoomOnScroll={false}
          ></ExampleFlow>
          <Box sx={{ flexGrow: 1, flexDirection: "row" }}></Box>
          <Stack sx={{ width: "48%", height: exampleHeight }}>
            <Typography variant="overline" display="block" gutterBottom>
              Document reader
            </Typography>
            <Box
              sx={{
                marginTop: "10px",
                height: "100%",
                border: "1px solid #D3D3D3",
                overflow: "auto",
              }}
            >
              <SelectionViewer noGroup={true} noTeleoscope={true}>
                {" "}
              </SelectionViewer>
            </Box>
          </Stack>
        </Stack>
      </Providers>
    );
  }

  if (props.type == "Workspace") {
    const dragNode = groupNode;
    dragNode.draggable = true;
    const nodes = [dragNode];
    return (
      <Providers>
        <Stack direction="row">
          <ExampleFlow
            label="Workspace"
            width="100%"
            nodes={nodes}
            edges={[]}
            panOnDrag={true}
            zoomOnScroll={true}
            minimap={true}
            controls={true}
          ></ExampleFlow>
          <Box sx={{ flexGrow: 1, flexDirection: "row" }}></Box>
        </Stack>
      </Providers>
    );
  }

  const teleoscope = {
    history: [
      {
        label: "Account fights",
        rank_slice: [],
      },
    ],
  };

  const [teleoscopeEdges, setTelescopeEdges] = React.useState([]);

  const [teleoscopeNode, setTeleoscopeNode] = React.useState({
    id: "%teleoscope",
    type: "Teleoscope",
    position: {
      x: 425,
      y: 25,
    },
    style: {
      width: 300,
      height: 300,
    },
    data: {
      label: "%teleoscope node",
      i: "%teleoscope",
      type: "Teleoscope",
      demo: true,
      demodata: {
        data: teleoscope,
        teleoscope: teleoscope,
      },
    },
    width: 300,
    height: 300,
    selected: false,
    positionAbsolute: {
      x: 0,
      y: 0,
    },
    dragging: false,
    draggable: false,
    connectable: true,
  });
  const doc2edge = {
    source: "637f7e826bc2573503502eb5%document",
    sourceHandle: "637f7e826bc2573503502eb5%document",
    target: "%teleoscope",
    targetHandle: "%teleoscope",
    id: "reactflow__edge-637f7e826bc2573503502eb5%document637f7e826bc2573503502eb5%document-%teleoscope%teleoscope",
  };
  const doc1edge = {
    source: "637f6542b4b0ff51b395d612%document",
    sourceHandle: "637f6542b4b0ff51b395d612%document",
    target: "%teleoscope",
    targetHandle: "%teleoscope",
    id: "reactflow__edge-637f6542b4b0ff51b395d612%document637f6542b4b0ff51b395d612%document-%teleoscope%teleoscope",
  };

  const doc1 = {
    id: "637f6542b4b0ff51b395d612%document",
    type: "Document",
    position: {
      x: 25,
      y: 25,
    },
    style: {
      width: 150,
      height: 34,
    },
    data: {
      label: "637f6542b4b0ff51b395d612%document node",
      i: "637f6542b4b0ff51b395d612%document",
      type: "Document",
      demo: true,
      demodata: {
        data: blocking_doc,
        document: blocking_doc,
      },
    },
    width: 150,
    height: 34,
    selected: false,
    positionAbsolute: {
      x: 0,
      y: 0,
    },
    dragging: false,
    draggable: false,
    connectable: true,
  };

  const doc2 = {
    id: "637f7e826bc2573503502eb5%document",
    type: "Document",
    position: {
      x: 25,
      y: 200,
    },
    style: {
      width: 150,
      height: 34,
    },
    data: {
      label: "637f7e826bc2573503502eb5%document node",
      i: "637f7e826bc2573503502eb5%document",
      type: "Document",
      demo: true,
      demodata: {
        data: taking_doc,
        document: taking_doc,
      },
    },
    width: 150,
    height: 34,
    selected: false,
    positionAbsolute: {
      x: 0,
      y: 0,
    },
    dragging: false,
    draggable: false,
    connectable: true,
  };

  const handleConnection = (edges) => {
    const sources = edges.map((edge) => edge.source);
    let update = {
      data: {
        ...teleoscopeNode.data,

        demodata: {
          data: teleoscope,
          teleoscope: teleoscope,
        },
      },
    };

    if (sources.includes(doc1.id) && sources.includes(doc2.id) === false) {
      setTelescopeEdges([doc1edge]);

      update = {
        data: {
          ...teleoscopeNode.data,

          demodata: {
            data: blocking_teleoscope,
            teleoscope: blocking_teleoscope,
          },
        },
      };
    }

    if (sources.includes(doc2.id) && sources.includes(doc1.id) === false) {
      setTelescopeEdges([doc2edge]);

      update = {
        data: {
          ...teleoscopeNode.data,

          demodata: {
            data: taking_teleoscope,
            teleoscope: taking_teleoscope,
          },
        },
      };
    }

    if (sources.includes(doc2.id) && sources.includes(doc1.id)) {
      setTelescopeEdges([doc1edge, doc2edge]);

      update = {
        data: {
          ...teleoscopeNode.data,

          demodata: {
            data: account_fights_teleoscope,
            teleoscope: account_fights_teleoscope,
          },
        },
      };
    }

    setTeleoscopeNode((teleoscopeNode) => ({
      ...teleoscopeNode,
      ...update,
    }));

  };

  if (props.type == "Teleoscope") {
    const nodes = [doc1, doc2, teleoscopeNode];
    return (
      <Providers>
        <Stack direction="row">
          <ExampleFlow
            label="Teleoscope"
            width="100%"
            nodes={nodes}
            edges={teleoscopeEdges}
            panOnDrag={false}
            zoomOnScroll={false}
            minimap={false}
            controls={false}
            onConnectCallback={handleConnection}
          ></ExampleFlow>
          <Box sx={{ flexGrow: 1, flexDirection: "row" }}></Box>
        </Stack>
      </Providers>
    );
  }

  return <div>Demo</div>;
} 