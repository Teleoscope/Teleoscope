import { configureStore } from "@reduxjs/toolkit";
import ActiveSessionID from "@/actions/activeSessionID";
import Windows, { removeWindow, updateEdges, updateNodes, updateSearch, makeGroupFromBookmarks, initializeProjection, removeCluster, relabelProjection, removeProjection, removeWorkflow, addGroup, removeGroup, recolorGroup, relabelGroup, mark, removeDocumentFromGroup, addDocumentToGroup, copyCluster, saveUIState, updateNote, addNote, relabelNote, removeNote, initializeWorkflow } from "@/actions/windows";
import { makeNode, makeEdge, setColor, relabelWorkflow } from "@/actions/windows";
import crypto from 'crypto';
import post from "@/util/client";
import { copyDoclistsToGroups, initializeTeleoscope, relabelTeleoscope, removeTeleoscope, updateNode } from "../actions/windows";


const headers = state => {
  return {
        replyTo: state.activeSessionID.replyToQueue,
        database: state.activeSessionID.database,
        userid: state.activeSessionID.userid,
        workflow_id: state.activeSessionID.value,
  }
}

// Custom middleware function for makeNode action
const makeNodeMiddleware = store => next => action => {
  if (action.type === makeNode.type) {
    const uid = crypto.randomBytes(8).toString('hex');

    // Perform any necessary modifications to the action payload
    const modifiedPayload = {
      ...action.payload,
      uid: uid,
    };

    // Create a new action object with the modified payload
    const modifiedAction = {
      ...action,
      payload: modifiedPayload,
    };

    // Call the next middleware or the reducer with the modified action
    const result = next(modifiedAction);

    // Perform the action or side effect you want to do after the store update
    const updatedState = store.getState();
    
    post({
      task: "add_item",
      args: {
        ...headers(updatedState),
        
        oid: modifiedAction.payload.oid,
        uid: modifiedAction.payload.uid,
        node_type: modifiedAction.payload.type,
        options: {index: modifiedAction.payload.index},
        state: updatedState
      }
    })
    
    return result;
  }

  if (action.type === makeEdge.type) {
    // Call the next middleware or the reducer with the modified action
    const result = next(action);
    const updatedState = store.getState();

    const nodes = updatedState.windows.nodes
    const source_node = nodes.find(n => n.id === action.payload.connection.source)
    const target_node = nodes.find(n => n.id === action.payload.connection.target)
    const handle_type = action.payload.connection.targetHandle.split("_").slice(-1)[0]

    post({
      task: "make_edge", 
      args: {
        ...headers(updatedState),

        session_id: updatedState.activeSessionID.value,
        source_node: source_node,
        target_node: target_node,
        edge_type: handle_type,
        connection: action.payload.connection,
        ui_state: updatedState
    }})
    return result
  }
  
  if (action.type === removeWindow.type) {
    const node_id = action.payload.node;
    const state = store.getState();
    const edges = state.windows.edges.filter(e => e.target.includes(node_id) || e.source.includes(node_id))

    edges.forEach(edge => {
      store.dispatch(updateEdges(
        {
          changes: [{
            id: edge.id,
            type: "remove"
          }]
        }
      ))}
    )
  }

  if (action.type === updateNodes.type) {
    const result = next(action);
    const changes = action.payload.changes;
    changes.forEach(change => {
      if (change.type == "remove") {
        const state = store.getState();
        const edges = state.windows.edges.filter(e => e.target == change.id || e.source == change.id)
        edges.forEach(edge => {
          store.dispatch(updateEdges(
            {
              changes: [{
                id: edge.id,
                type: "remove"
              }]
            }
          ))}
        )
      }
    })
    return result
  }

  if (action.type === updateEdges.type) {
    const changes = action.payload.changes
    changes.forEach(change => {
      if (change.type == "remove") {
        const state = store.getState();
        const edges = state.windows.edges;
        const edge = edges.find(e => e.id == change.id)

        post({
          task: "remove_edge",
          args: {
            ...headers(store.getState()),
            edge: edge
          }
        })
      }
    })
  }

  const callPost = (task_name) => post({ 
    task: task_name, 
    args: { 
      ...headers(store.getState()), 
      ...action.payload 
    } 
  })
  
  switch (action.type) {
    case initializeWorkflow.type:
        callPost("initialize_workflow")
        break;
    case setColor.type:
        callPost("recolor_workflow")
        break;
    case relabelWorkflow.type:
        callPost("relabel_workflow")
        break;
    case updateSearch.type:
        callPost("update_search")
        break;
    case makeGroupFromBookmarks.type:
        callPost("add_group")
        break;
    case copyDoclistsToGroups.type:
        callPost("copy_doclists_to_groups")
        break;
    case updateNode.type:
        callPost("update_node")
        break;
    case initializeTeleoscope.type:
        callPost("initialize_teleoscope")
        break;
    case removeTeleoscope.type:
        callPost("remove_teleoscope")
        break;
    case relabelTeleoscope.type:
        callPost("relabel_teleoscope")
        break;
    case removeCluster.type:
        callPost("remove_cluster")
        break;
    case initializeProjection.type:
        callPost("initialize_projection")
        break;
    case relabelProjection.type:
        callPost("relabel_projection")
        break;
    case removeProjection.type:
        callPost("remove_projection")
        break;
    case removeWorkflow.type:
        callPost("remove_workflow")
        break;
    case addGroup.type:
        callPost("add_group") 
        break;
    case removeGroup.type:
        callPost("remove_group") 
        break;
    case recolorGroup.type:
        callPost("recolor_group")
        break;
    case relabelGroup.type:
        callPost("relabel_group")
        break;
    case mark.type:
        callPost("mark")
        break;
    case removeDocumentFromGroup.type:
        callPost("remove_document_from_group")
        break;
    case addDocumentToGroup.type:
        callPost("add_document_to_group")
        break;
    case copyCluster.type:
        callPost("copy_cluster")
        break;
    case saveUIState.type:
        callPost("save_UI_state")
        break;
    case updateNote.type:
        callPost("update_note")
        break;
    case addNote.type:
        callPost("add_note")
        break;
    case relabelNote.type:
        callPost("relabel_note")
        break;
    case removeNote.type:
        callPost("remove_note")
        break;
  }

  // Call the next middleware or the reducer
  const result = next(action);
  return result;
};


export let store;
const createStore = (preloadedState) => {
  if (typeof window === 'undefined') {
    return configureStore({
      reducer: {
        activeSessionID: ActiveSessionID,
        windows: Windows,
      },
      preloadedState: preloadedState,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: {
            // Ignore these action types
            ignoredActions: ["your/action/type"],
            // Ignore these field paths in all actions
            ignoredActionPaths: ["payload.client"],
            // Ignore these paths in the state
            ignoredPaths: ["items.dates"],
          },
        }).concat(makeNodeMiddleware),
    });
  }

  if (!store) {
    store = configureStore({
      reducer: {
        activeSessionID: ActiveSessionID,
        windows: Windows,
      },
      preloadedState: preloadedState,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: {
            // Ignore these action types
            ignoredActions: ["your/action/type"],
            // Ignore these field paths in all actions
            ignoredActionPaths: ["payload.client"],
            // Ignore these paths in the state
            ignoredPaths: ["items.dates"],
          },
        }).concat(makeNodeMiddleware),
    });
  }
  return store
}




export const demoStore = configureStore({
  reducer: {
    activeSessionID: ActiveSessionID,
    windows: Windows,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ["your/action/type"],
        // Ignore these field paths in all actions
        ignoredActionPaths: ["payload.client"],
        // Ignore these paths in the state
        ignoredPaths: ["items.dates"],
      },
    }).concat(makeNodeMiddleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {documents: DocumentsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;


export default createStore;

