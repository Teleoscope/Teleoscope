// appState.ts
import { DEFAULT_STATE } from "@/lib/defaults";
import { createSlice } from "@reduxjs/toolkit";
import { applyNodeChanges, applyEdgeChanges } from "reactflow";

const initialState = DEFAULT_STATE

function updateObject(target, update) {
  for (let key in update) {
      if (update.hasOwnProperty(key)) {
          if (typeof update[key] === 'object' && update[key] !== null) {
              // If the key exists in the target and is an object, recursively update it
              if (target[key] && typeof target[key] === 'object') {
                  updateObject(target[key], update[key]);
              }
          } else if (key in target) {
              // If the key exists in the target and is not an object, update it
              target[key] = update[key];
          }
      }
  }
}

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
      state.workflow.label = action.payload.label;
    },
    bookmark: (state, action) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes
      var id: string = action.payload; // value of documentid
      var temp = [...state.workflow.bookmarks];
      // add to workspace
      var i = temp.indexOf(id);
      if (i > -1) {
        temp.splice(i, 1);
      } else {
        temp.push(id);
      }
      state.workflow.bookmarks = temp;
    },
    loadBookmarkedDocuments: (state, action) => {
      state.workflow.bookmarks = action.payload;
    },
    resetWorkspace: () => initialState,
    setColor: (state, action) => {
      state.workflow.settings.color = action.payload.color;
    },
    setSettings: (state, action) => {
      var temp = { ...state };
      updateObject(temp, action.payload)
      state = temp;
    },
    setSelection: (state, action) => {
      state.workflow.selection = action.payload;
    },
    removeWindow: (state, action) => {
      var temp_nodes = [...state.workflow.nodes];
      var node_ids = state.workflow.nodes.map((n) => {
        return n.id;
      });
      var node_index = node_ids.indexOf(action.payload.node);
      if (node_index > -1) {
        temp_nodes.splice(node_index, 1);
      }

      var temp_edges = [...state.workflow.edges];
      var edge_ids = state.workflow.edges.map((e) => {
        return e.source;
      });
      var edge_index = edge_ids.indexOf(action.payload.node);
      if (edge_index > -1) {
        temp_edges.splice(edge_index, 1);
      }
      state.workflow.nodes = temp_nodes;
      state.workflow.edges = temp_edges;
    },
    moveWindowToFront: (state, action) => {
      var temp = [...state.workflow.nodes];
      var ids = state.workflow.nodes.map((w) => {
        return w.i;
      });
      var index = ids.indexOf(action.payload);

      if (index > -1) {
        var tempitem = { ...temp[index] };
        temp.splice(index, 1);
        temp.push(tempitem);
      }
      state.workflow.nodes = temp;
    },
    toggleMinMax: (state, action) => {
      var temp = [...state.workflow.nodes];
      var ids = state.workflow.nodes.map((w) => {
        return w.id;
      });
      var index = ids.indexOf(action.payload.id);
      if (index > -1) {
        if (temp[index].width > state.workspace.settings?.document_width ||
            temp[index].height > state.workspace.settings?.document_height) {
              temp[index].width = state.workspace.settings?.document_width;
              temp[index].height = state.workspace.settings?.document_height;
              temp[index].style.width = state.workspace.settings?.document_width;
              temp[index].style.height = state.workspace.settings?.document_height;
        } else {
          temp[index].width = 300;
          temp[index].height = 340;
          temp[index].style.width = 300;
          temp[index].style.height = 340;
        }
      }
      state.workflow.nodes = temp;
    },
    minimizeWindow: (state, action) => {
      var temp = [...state.workflow.nodes];
      var ids = state.workflow.nodes.map((w) => {
        return w.id;
      });
      var index = ids.indexOf(action.payload.id);
      if (index > -1) {
        temp[index].width = state.workspace.settings?.document_width;
        temp[index].height = state.workspace.settings?.document_height;
        temp[index].style.width = state.workspace.settings?.document_width;
        temp[index].style.height = state.workspace.settings?.document_height;
      }
      state.workflow.nodes = temp;
    },
    maximizeWindow: (state, action) => {
      var temp = [...state.workflow.nodes];
      var ids = state.workflow.nodes.map((w) => {
        return w.id;
      });
      var index = ids.indexOf(action.payload.id);
      if (index > -1) {
        temp[index].width = 400;
        temp[index].height = 450;
        temp[index].style.width = 400;
        temp[index].style.height = 450;
      }
      state.workflow.nodes = temp;
    },
    updateSearch: (state, action) => {
      var temp = [...state.workflow.nodes];
      var index = temp.findIndex(n => n.data.oid === action.payload.search_id);
      if (index > -1) {
        temp[index].data["query"] = action.payload.query;
        
      }
      state.workflow.nodes = temp;
    },
    updateWindows: (state, action) => {
      var temp = [...state.workflow.nodes];
      action.payload.forEach((w) => {
        var index = state.workflow.nodes.findIndex((item) => w.i === item.i);
        if (index > -1) {
          temp[index].x = w.x;
          temp[index].y = w.y;
          temp[index].h = w.h;
          temp[index].w = w.w;
        }
      });
      state.workflow.nodes = temp;
    },
    // checkWindow({i: str, check: bool})
    checkWindow: (state, action) => {
      var index = state.workflow.nodes.findIndex((w) => w.i == action.payload.i);
      if (index > 0) {
        state.workflow.nodes[index].isChecked = action.payload.check;
      }
    },
    deselectAll: (state, action) => {
      var temp = [...state.workflow.nodes];
      temp.forEach((w) => {
        w.isChecked = false;
      });
      state.workflow.nodes = temp;
    },
    selectAll: (state, action) => {
      var temp = [...state.workflow.nodes];
      temp.forEach((w) => {
        if (w.type == "Document") {
          w.isChecked = true;
        }
      });
      state.workflow.nodes = temp;
    },
    loadWindows: (state, action) => {
      state.workflow.nodes = action.payload;
    },
    setNodes: (state, action) => {
      state.workflow.nodes = action.payload.nodes;
    },
    setEdges: (state, action) => {
      state.workflow.edges = action.payload.edges;
    },
    updateNodes: (state, action) => {
      const changes = action.payload.changes;
      const nodes = applyNodeChanges(changes, state.workflow.nodes);
      state.workflow.nodes = nodes;
    },
    updateEdges: (state, action) => {
      const changes = action.payload.changes;
      const edges = applyEdgeChanges(changes, state.workflow.edges);
      state.workflow.edges = edges;
    },
    setDraggable: (state, action) => {
      var temp = [...state.workflow.nodes];
      var index = temp.findIndex((w) => w.id == action.payload.id);
      if (index >= 0) {
        temp[index]["draggable"] = action.payload.draggable;
      }
      state.workflow.nodes = temp;
    },
    makeNode: (state, action) => {
      
      var temp = [...state.workflow.nodes];
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
      state.workflow.nodes = temp;
    },
    makeEdge: (state, action) => {
      const { edges } = action.payload;
      var temp = [...state.workflow.edges];
      var duplicateEdge = false;
      temp.forEach(se => edges.forEach(ae => {
        if (se.id == ae.id) {
          duplicateEdge = true;
        }
      }))
      var combine = [...state.workflow.edges, ...edges];
      if (!duplicateEdge) {
        state.workflow.edges = combine;        
      } else {
        state.workflow.edges = state.workflow.edges;
      }
    },
    OID_UID_SYNC: (state, action) => {
      var temp = [...state.workflow.nodes];
      var index = state.workflow.nodes.map((n) => {
        return n.data.uid;
      }).indexOf(action.payload.uid);
      
      if (index > -1) {
        const id = `${action.payload.oid}%${action.payload.uid}%${temp[index].data.type.toLowerCase()}`
        temp[index].data.oid = action.payload.oid;
        temp[index].data.nodeid = action.payload.nodeid;
        temp[index].data.label = id
        temp[index].id = id
      }
      
      state.workflow.nodes = temp;
    },
    // API reflections
    makeGroupFromBookmarks: (state, action) => {
      state.workflow.bookmarks = [];
    },
    copyDoclistsToGroups: (state, action) => {
      // add any state changes here
    },
    updateNode: (state, action) => {
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
  removeWindow,
  loadWindows,
  updateSearch,
  updateWindows,
  minimizeWindow,
  maximizeWindow,
  checkWindow,
  selectAll,
  deselectAll,
  moveWindowToFront,
  toggleMinMax,
  makeGroupFromBookmarks,
  copyDoclistsToGroups,
  updateNode,
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