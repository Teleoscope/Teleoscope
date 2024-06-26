// appState.ts
import { DEFAULT_STATE } from "@/lib/defaults";
import { createSlice } from "@reduxjs/toolkit";
import { applyNodeChanges, applyEdgeChanges, Edge } from "reactflow";

const initialState = DEFAULT_STATE

export const AppState = createSlice({
  name: "app",
  initialState: initialState,
  reducers: {
    loadAppData: (state, action) => {
      console.log("app state", action.payload)
      state.workspace = action.payload.workspace;
      state.workflow = action.payload.workflow;
    },
    relabelWorkflow: (state, action) => {
      state.appState.workflow.label = action.payload.label;
    },
    minimizeWindow: (state, action) => {
      var temp = [...state.appState.workflow.nodes];
      var ids = state.appState.workflow.nodes.map((w) => {
        return w.id;
      });
      var index = ids.indexOf(action.payload.id);
      if (index > -1) {
        temp[index].width = state.workspace.settings.document_width;
        temp[index].height = state.workspace.settings.document_height;
        temp[index].style.width = state.workspace.settings.document_width;
        temp[index].style.height = state.workspace.settings.document_height;
      }
      state.appState.workflow.nodes = temp;
    },
    maximizeWindow: (state, action) => {
      var temp = [...state.appState.workflow.nodes];
      var ids = state.appState.workflow.nodes.map((w) => {
        return w.id;
      });
      var index = ids.indexOf(action.payload.id);
      if (index > -1) {
        temp[index].width = 400;
        temp[index].height = 450;
        temp[index].style.width = 400;
        temp[index].style.height = 450;
      }
      state.appState.workflow.nodes = temp;
    },
    removeWindow: (state, action) => {
      var temp_nodes = [...state.appState.workflow.nodes];
      var node_ids = state.appState.workflow.nodes.map((n) => {
        return n.id;
      });
      var node_index = node_ids.indexOf(action.payload.node);
      if (node_index > -1) {
        temp_nodes.splice(node_index, 1);
      }

      var temp_edges = [...state.appState.workflow.edges];
      var edge_ids = state.appState.workflow.edges.map((e) => {
        return e.source;
      });
      var edge_index = edge_ids.indexOf(action.payload.node);
      if (edge_index > -1) {
        temp_edges.splice(edge_index, 1);
      }
      state.appState.workflow.nodes = temp_nodes;
      state.appState.workflow.edges = temp_edges;
    },
    bookmark: (state, action) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes
      var id: string = action.payload; // value of documentid
      var temp = [...state.appState.workflow.bookmarks];
      // add to workspace
      var i = temp.indexOf(id);
      if (i > -1) {
        temp.splice(i, 1);
      } else {
        temp.push(id);
      }
      state.appState.workflow.bookmarks = temp;
    },
    loadBookmarkedDocuments: (state, action) => {
      state.appState.workflow.bookmarks = action.payload;
    },
    resetWorkspace: () => initialState,
    setColor: (state, action) => {
      state.appState.workflow.settings.color = action.payload.color;
    },
    setSettings: (state, action) => {
      state.appState.workflow.settings = action.payload;
    },
    setSelection: (state, action) => {
      state.appState.workflow.selection = action.payload;
    },
    updateSearch: (state, action) => {
      var temp = [...state.appState.workflow.nodes];
      var index = temp.findIndex(n => n.data.oid === action.payload.search_id);
      if (index > -1) {
        temp[index].data["query"] = action.payload.query;
        
      }
      state.appState.workflow.nodes = temp;
    },
    setNodes: (state, action) => {
      state.appState.workflow.nodes = action.payload.nodes;
    },
    setEdges: (state, action) => {
      state.appState.workflow.edges = action.payload.edges;
    },
    updateNodes: (state, action) => {
      const changes = action.payload.changes;
      const nodes = applyNodeChanges(changes, state.appState.workflow.nodes);
      state.appState.workflow.nodes = nodes;
    },
    updateEdges: (state, action) => {
      const changes = action.payload.changes;
      const edges = applyEdgeChanges(changes, state.appState.workflow.edges);
      state.appState.workflow.edges = edges;
    },
    setDraggable: (state, action) => {
      var temp = [...state.appState.workflow.nodes];
      var index = temp.findIndex((w) => w.id == action.payload.id);
      if (index >= 0) {
        temp[index]["draggable"] = action.payload.draggable;
      }
      state.appState.workflow.nodes = temp;
    },
    makeNode: (state, action) => {
      var temp = [...state.appState.workflow.nodes];
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
      state.appState.workflow.nodes = temp;
    },
    makeEdge: (state, action) => {
      const { edges } = action.payload;
      var temp = [...state.appState.workflow.edges];
      var duplicateEdge = false;
      temp.forEach(se => edges.forEach((ae: Edge) => {
        if (se.id == ae.id) {
          duplicateEdge = true;
        }
      }))
      var combine = [...state.appState.workflow.edges, ...edges];
      if (!duplicateEdge) {
        state.appState.workflow.edges = combine;        
      } else {
        state.appState.workflow.edges = state.appState.workflow.edges;
      }
    },
    OID_UID_SYNC: (state, action) => {
      var temp = [...state.appState.workflow.nodes];
      var index = state.appState.workflow.nodes.map((n) => {
        return n.data.uid;
      }).indexOf(action.payload.uid);
      
      if (index > -1) {
        const id = `${action.payload.oid}%${action.payload.uid}%${temp[index].data.type.toLowerCase()}`
        temp[index].data.oid = action.payload.oid;
        temp[index].data.nodeid = action.payload.nodeid;
        temp[index].data.label = id
        temp[index].id = id
      }
      
      state.appState.workflow.nodes = temp;
    },
    // API reflections
    makeGroupFromBookmarks: (state, action) => {
      state.appState.workflow.bookmarks = [];
    },
    copyDoclistsToGroups: (state, action) => {
      // add any state changes here
    },
    updateNode: (state, action) => {
      // add any state changes here
    },
    initializeTeleoscope: (state, action) => {
      // add any state changes here
    },
    removeTeleoscope: (state, action) => {
      // add any state changes here
    },
    relabelTeleoscope: (state, action) => {
      // add any state changes here
    },
    removeCluster: (state, action) => {
      // add any state changes here
    },
    initializeProjection: (state, action) => {
      // add any state changes here
    },
    relabelProjection: (state, action) => {
      // add any state changes here
    },
    removeProjection: (state, action) => {
      // add any state changes here
    },
    removeWorkflow: (state, action) => {
      // add any state changes here
    },
    initializeWorkflow: (state, action) => {
      // add any state changes here
    },
    addGroup: (state, action) => {
      // add any state changes here
    },
    removeGroup: (state, action) => {
      // add any state changes here
    },
    recolorGroup: (state, action) => {
      // add any state changes here
    },
    relabelGroup: (state, action) => {
      // add any state changes here
    },
    mark: (state, action) => {
      // add any state changes here
    },
    removeDocumentFromGroup: (state, action) => {
      // add any state changes here
    },
    addDocumentToGroup: (state, action) => {
      // add any state changes here
    },
    copyCluster: (state, action) => {
      // add any state changes here
    },
    clusterByGroups: (state, action) => {
      // add any state changes here
    },
    saveUIState: (state, action) => {
      // add any state changes here
    },
    updateNote: (state, action) => {
      // add any state changes here
    },
    addNote: (state, action) => {
      // add any state changes here
    },
    relabelNote: (state, action) => {
      // add any state changes here
    },
    removeNote: (state, action) => {
      // add any state changes here
    },
  }
});

export const {
  // Responses from RabbitMQ
  OID_UID_SYNC,
  // Local actions
  relabelWorkflow,
  minimizeWindow,
  maximizeWindow,
  removeWindow,
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
  updateSearch,
  makeGroupFromBookmarks,
  copyDoclistsToGroups,
  updateNode,
  initializeTeleoscope,
  removeTeleoscope,
  relabelTeleoscope,
  removeCluster,
  initializeProjection,
  relabelProjection,
  removeProjection,
  removeWorkflow,
  initializeWorkflow,
  addGroup,
  removeGroup,
  recolorGroup,
  relabelGroup,
  mark,
  removeDocumentFromGroup,
  addDocumentToGroup,
  copyCluster,
  clusterByGroups,
  saveUIState,
  updateNote,
  addNote,
  relabelNote,
  removeNote,
  loadAppData

} = AppState.actions;
export default AppState.reducer;
