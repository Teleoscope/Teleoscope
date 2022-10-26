import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit'

import ActiveSessionID from "../actions/activeSessionID"
import ActiveHistoryItem from "../actions/activeHistoryItem"
import Bookmark from "../actions/bookmark"
import Groups from '../actions/groups'
import Windows from '../actions/windows'
import Login from '../actions/logins'
import Register from '../actions/registration'

const store = configureStore({
  reducer: {
    activeSessionID: ActiveSessionID,
    activeHistoryItem: ActiveHistoryItem,
    bookmarker: Bookmark,
    grouper: Groups,
    windows: Windows,
    checkLogin: Login,
    pushRegistration: Register
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['your/action/type'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.client'],
        // Ignore these paths in the state
        ignoredPaths: ['items.dates'],
      },
    })
})


// Infer the `RootState` and `AppDispatch` types from the store itself
//export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
//export type AppDispatch = typeof store.dispatch

export default store;