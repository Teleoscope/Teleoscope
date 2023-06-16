import { configureStore, getDefaultMiddleware } from "@reduxjs/toolkit";
import ActiveSessionID from "@/actions/activeSessionID";
import Windows from "@/actions/windows";
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
    
    action.payload.client.add_item(
      updatedState.activeSessionID.value,
      modifiedAction.payload.oid,
      modifiedAction.payload.uid,
      modifiedAction.payload.type,
      updatedState,
    );
    
    return result;
  }

  if (action.type === makeEdge.type) {
    // Call the next middleware or the reducer with the modified action
    const result = next(action);
    const updatedState = store.getState();
    action.payload.client.update_edges(
      updatedState.activeSessionID.value,
      action.payload.edges,
      updatedState
    )
    return result
  }
  
  if (action.type === setColor.type) {
    const result = next(action);
    action.payload.client.recolor_session(action.payload.color, action.payload.session_id);
    return result
  }

  if (action.type === relabelSession.type) {
    const result = next(action);
    action.payload.client.relabel_session(action.payload.label, action.payload.session_id);
    return result
  }

  // Call the next middleware or the reducer
  const result = next(action);
  return result;
};

const store = configureStore({
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

export default store;
