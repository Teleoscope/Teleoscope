// windows.js
import { createSlice } from "@reduxjs/toolkit";
import _ from "lodash";
import { applyNodeChanges, applyEdgeChanges } from "reactflow";
import crypto from 'crypto';

const initialState = {
  nodes: [],
  edges: [],
  logical_clock: -1,
  color: "#D3D3D3",
  windows: [],
  selection: {
    nodes: [],
    edges: [],
  },
  dragged: { id: "default", type: "Default" },
  collision: true,
  settings: {
    default_document_width: 200,
    default_document_height: 34,
    defaultExpanded: true,
  },
};

export const Windows = createSlice({
  name: "windows",
  initialState: initialState,
  reducers: {
    resetWorkspace: () => initialState,
    setColor: (state, action) => {
      state.color = action.payload.color;
    },
    setSettings: (state, action) => {
      state.settings = action.payload;
    },
    setSelection: (state, action) => {
      state.selection = action.payload;
    },
    setLogicalClock: (state, action) => {
      state.logical_clock = action.payload;
    },
    setDefault: (state, action) => {
      state.windows = initialState.windows;
    },
    dragged: (state, action) => {
      state.dragged = action.payload;
    },
    collision: (state, action) => {
      state.collision = action.payload;
    },
    removeWindow: (state, action) => {
      var temp_nodes = [...state.nodes];
      var node_ids = state.nodes.map((n) => {
        return n.id;
      });
      var node_index = node_ids.indexOf(action.payload);
      if (node_index > -1) {
        temp_nodes.splice(node_index, 1);
      }

      var temp_edges = [...state.edges];
      var edge_ids = state.edges.map((e) => {
        return e.source;
      });
      var edge_index = edge_ids.indexOf(action.payload);
      if (edge_index > -1) {
        temp_edges.splice(edge_index, 1);
      }
      state.nodes = temp_nodes;
      state.edges = temp_edges;
    },
    moveWindowToFront: (state, action) => {
      var temp = [...state.windows];
      var ids = state.windows.map((w) => {
        return w.i;
      });
      var index = ids.indexOf(action.payload);

      if (index > -1) {
        var tempitem = { ...temp[index] };
        temp.splice(index, 1);
        temp.push(tempitem);
      }
      state.windows = temp;
    },
    minimizeWindow: (state, action) => {
      var temp = [...state.nodes];
      var ids = state.nodes.map((w) => {
        return w.id;
      });
      var index = ids.indexOf(action.payload.id);
      if (index > -1) {
        temp[index].width = 60;
        temp[index].height = 34;
        temp[index].style.width = 60;
        temp[index].style.height = 34;
      }
      state.windows = temp;
    },
    maximizeWindow: (state, action) => {
      var temp = [...state.nodes];
      var ids = state.nodes.map((w) => {
        return w.id;
      });
      var index = ids.indexOf(action.payload.id);
      if (index > -1) {
        temp[index].width = 300;
        temp[index].height = 340;
        temp[index].style.width = 300;
        temp[index].style.height = 340;
      }
      state.windows = temp;
    },
    updateSearch: (state, action) => {
      var temp = [...state.nodes];
      var index = temp.findIndex(n => n.id === action.payload.id);
      if (index > -1) {
        temp[index].data["query"] = action.payload.term;
        
      }
      console.log("query", action.payload.term, action.payload.id, index, temp[index])
      state.nodes = temp;
    },
    updateWindows: (state, action) => {
      var temp = [...state.windows];
      action.payload.forEach((w) => {
        var index = state.windows.findIndex((item) => w.i === item.i);
        if (index > -1) {
          temp[index].x = w.x;
          temp[index].y = w.y;
          temp[index].h = w.h;
          temp[index].w = w.w;
        }
      });
      state.windows = temp;
    },
    // checkWindow({i: str, check: bool})
    checkWindow: (state, action) => {
      var index = state.windows.findIndex((w) => w.i == action.payload.i);
      if (index > 0) {
        state.windows[index].isChecked = action.payload.check;
      }
    },
    deselectAll: (state, action) => {
      var temp = [...state.windows];
      temp.forEach((w) => {
        w.isChecked = false;
      });
      state.windows = temp;
    },
    selectAll: (state, action) => {
      var temp = [...state.windows];
      temp.forEach((w) => {
        if (w.type == "Document") {
          w.isChecked = true;
        }
      });
      state.windows = temp;
    },
    loadWindows: (state, action) => {
      state.windows = action.payload;
    },
    setNodes: (state, action) => {
      state.logical_clock = action.payload.logical_clock;
      state.nodes = action.payload.nodes;
    },
    setEdges: (state, action) => {
      state.logical_clock = action.payload.logical_clock;
      state.edges = action.payload.edges;
    },
    updateNodes: (state, action) => {
      const changes = action.payload;
      const nodes = applyNodeChanges(changes, state.nodes);
      state.logical_clock = state.logical_clock + 1;
      state.nodes = nodes;
    },
    updateEdges: (state, action) => {
      const changes = action.payload;
      const edges = applyEdgeChanges(changes, state.edges);
      state.logical_clock = state.logical_clock + 1;
      state.edges = edges;
    },
    setDraggable: (state, action) => {
      var temp = [...state.nodes];
      var index = temp.findIndex((w) => w.id == action.payload.id);
      if (index >= 0) {
        temp[index]["draggable"] = action.payload.draggable;
      }
      state.nodes = temp;
    },
    makeNode: (state, action) => {
      var temp = [...state.nodes];
      const { oid, type, width, height, x, y } = action.payload;
      const uid =  crypto.randomBytes(8).toString('hex');
      const id = `${oid.split("%")[0]}%${uid}%${type.toLowerCase()}`

      const newNode = {
        id: id,
        type: type,
        position: {
          x: x,
          y: y,
        },
        positionAbsolute: {
          x: x,
          y: y
        },
        style: {
          width: width,
          height: height,
        },
        data: { 
          label: id,
          i: oid.split("%")[0],
          type: type,
          uid: uid
        },
      };

      temp.push(newNode);
      state.logical_clock = state.logical_clock + 1;
      state.nodes = temp;
    },
    makeEdge: (state, action) => {
      var temp = [...state.edges];
      var duplicateEdge = false;
      temp.forEach(se => action.payload.edges.forEach(ae => {
        if (se.id == ae.id) {
          duplicateEdge = true;
        }
      }))
      var combine = [...state.edges, ...action.payload.edges];
      state.logical_clock = state.logical_clock + 1;
      if (!duplicateEdge) {
        state.edges = combine;        
      } else {
        state.edges = state.edges;
      }
    },
  },
});

export const {
  setColor,
  resetWorkspace,
  setSelection,
  setSettings,
  makeNode,
  setDraggable,
  updateNodes,
  setEdges,
  makeEdge,
  updateEdges,
  setNodes,
  setDefault,
  removeWindow,
  loadWindows,
  dragged,
  updateSearch,
  updateWindows,
  minimizeWindow,
  maximizeWindow,
  checkWindow,
  selectAll,
  deselectAll,
  moveWindowToFront,
  setLogicalClock,
  setWindows,
} = Windows.actions;
export default Windows.reducer;
