import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit'

import SearchTerm from "../actions/searchterm"
import ActiveTeleoscopeID from "../actions/activeTeleoscopeID"
import ActiveSessionID from "../actions/activeSessionID"
import ActiveHistoryItem from "../actions/activeHistoryItem"
import CheckedPosts from "../actions/checkedPosts"
import Bookmark from "../actions/bookmark"
import Groups from '../actions/groups'
import Windows from '../actions/windows'
import Login from '../actions/logins'
import Register from '../actions/registration'

export default configureStore({
  reducer: {
    searchTerm: SearchTerm,
    activeTeleoscopeID: ActiveTeleoscopeID,
    activeSessionID: ActiveSessionID,
    activeHistoryItem: ActiveHistoryItem,
    checkedPosts: CheckedPosts,
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

