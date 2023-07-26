import { configureStore } from "@reduxjs/toolkit";
import ActiveSessionID from "@/actions/activeSessionID";
import Windows, { updateEdges, updateSearch } from "@/actions/windows";
import { makeNode, makeEdge, setColor, relabelSession } from "@/actions/windows";
import crypto from 'crypto';


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
    
    action.payload.client.add_item({
      workflow_id: updatedState.activeSessionID.value,
      oid: modifiedAction.payload.oid,
      uid: modifiedAction.payload.uid,
      type: modifiedAction.payload.type,
      options: {index: modifiedAction.payload.index},
      state: updatedState
  });
    
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

    action.payload.client.make_edge({
      session_id: updatedState.activeSessionID.value,
      source_node: source_node,
      target_node: target_node,
      handle_type: handle_type,
      connection: action.payload.connection,
      ui_state: updatedState
    })
    return result
  }
  
  if (action.type === setColor.type) {
    const result = next(action);
    action.payload.client.recolor_workflow(action.payload.color, action.payload.session_id);
    return result
  }

  if (action.type === relabelSession.type) {
    const result = next(action);
    action.payload.client.relabel_workflow(action.payload.label, action.payload.session_id);
    return result
  }

  if (action.type === updateSearch.type) {
    const result = next(action);
    action.payload.client.update_search(action.payload.search_id, action.payload.query);
    return result
  }

  if (action.type === updateEdges.type) {
    const changes = action.payload.changes
    changes.forEach(change => {
      if (change.type == "remove") {
        const state = store.getState();
        const edges = state.windows.edges;
        const edge = edges.find(e => e.id == change.id)
        action.payload.client.remove_edge(edge)
      }
    })
    const result = next(action);
    // action.payload.client.update_search(action.payload.search_id, action.payload.query);
    return result
  }

  // Call the next middleware or the reducer
  const result = next(action);
  return result;
};


// let store;
// const createStore = (preloadedState) => {
//   if (typeof window === 'undefined') {
//     return configureStore({
//       reducer: { ... },
//       preloadedState,
//     });
//   }

//   if (!store) {
//     store = configureStore({
//       reducer: { ... },
//       preloadedState,
//     });
//   }

//   return store;
// };

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

