// windows.js
import { createSlice } from "@reduxjs/toolkit";
import _ from "lodash";
import { applyNodeChanges, applyEdgeChanges, Position } from "reactflow";

const initialState = {
  nodes: [],
  edges: [],
  bookmarks: [],
  logical_clock: -1,
  label: "default",
  selection: {
    nodes: [],
    edges: [],
  },
  settings: {
    default_document_width: 200,
    default_document_height: 34,
    defaultExpanded: true,
    color: "#D3D3D3",
  },
  // deprecated but in for legacy
  windows: [],
};

export const Windows = createSlice({
  name: "windows",
  initialState: initialState,
  reducers: {
    relabelSession: (state, action) => {
      state.label = action.payload.label;
    },
    bookmark: (state, action) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes
      var id = action.payload; // value of documentid
      var temp = [...state.bookmarks];
      // add to workspace
      var i = temp.indexOf(id);
      if (i > -1) {
        temp.splice(i, 1);
      } else {
        temp.push(id);
      }
      state.bookmarks = temp;
    },
    loadBookmarkedDocuments: (state, action) => {
      state.bookmarks = action.payload;
    },
    resetWorkspace: () => initialState,
    setColor: (state, action) => {
      state.settings.color = action.payload.color;
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
        temp[index].width = state.settings.default_document_width;
        temp[index].height = state.settings.default_document_height;
        temp[index].style.width = state.settings.default_document_width;
        temp[index].style.height = state.settings.default_document_height;
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
      const { oid, uid, type, width, height, x, y } = action.payload;
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
          oid: oid.split("%")[0],
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
    OID_UID_SYNC: (state, action) => {
      console.log("Received OID UID SYNC for", action)
      var temp = [...state.nodes];
      var index = state.nodes.map((n) => {
        return n.data.uid;
      }).indexOf(action.payload.uid);
      
      if (index > -1) {
        const id = `${action.payload.oid}%${action.payload.uid}%${temp[index].data.type.toLowerCase()}`
        temp[index].data.oid = action.payload.oid;
        temp[index].data.label = id
        temp[index].id = id
        console.log(`Associated UID ${temp[index].data.uid} with OID ${temp[index].data.oid}`)

      } else {
        console.log(`Failed to associated UID ${temp[index].data.uid} with OID ${action.payload.oid}`)
      }
      
      state.nodes = temp;
    }
  },
});

export const {
  // Responses from RabbitMQ
  OID_UID_SYNC,
  // Local actions
  relabelSession,
  bookmark,
  loadBookmarkedDocuments,
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
