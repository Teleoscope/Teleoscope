import { configureStore, getDefaultMiddleware } from "@reduxjs/toolkit";
import ActiveSessionID from "@/actions/activeSessionID";
import ActiveHistoryItem from "@/actions/activeHistoryItem";
import Bookmark from "@/actions/bookmark";
import Windows from "@/actions/windows";
import Teleoscopes from "@/actions/teleoscopes";
import { makeNode } from "@/actions/windows";
import crypto from 'crypto';
import { ObjectId } from "bson";

// Custom middleware function for makeNode action
const makeNodeMiddleware = store => next => action => {
  // Check if the specific action you're interested in has been dispatched
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
      modifiedAction.payload.session_id,
      modifiedAction.payload.oid,      
      modifiedAction.payload.uid,
      modifiedAction.payload.type,
      updatedState,
    );
    
    return result;
  }

  // Call the next middleware or the reducer
  const result = next(action);
  return result;
};

const store = configureStore({
  reducer: {
    activeSessionID: ActiveSessionID,
    activeHistoryItem: ActiveHistoryItem,
    bookmarker: Bookmark,
    windows: Windows,
    teleoscopes: Teleoscopes,
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
