import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit'

import ActiveSessionID from "../actions/activeSessionID"
import ActiveHistoryItem from "../actions/activeHistoryItem"
import Bookmark from "../actions/bookmark"
import Groups from '../actions/groups'
import Windows from '../actions/windows'

export default configureStore({
  reducer: {
    activeSessionID: ActiveSessionID,
    activeHistoryItem: ActiveHistoryItem,
    bookmarker: Bookmark,
    grouper: Groups,
    windows: Windows,
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

