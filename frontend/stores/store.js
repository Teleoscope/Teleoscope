import { configureStore } from '@reduxjs/toolkit'

import SearchTerm from "../actions/searchterm"
import ActiveTeleoscopeID from "../actions/activeTeleoscopeID"
import ActiveSessionID from "../actions/activeSessionID"
import ActiveHistoryItem from "../actions/activeHistoryItem"
import CheckedPosts from "../actions/checkedPosts"
import Bookmark from "../actions/bookmark"
import Grouped from '../actions/groups'
import Windows from '../actions/windows'

export default configureStore({
  reducer: {
    searchTerm: SearchTerm,
    activeTeleoscopeID: ActiveTeleoscopeID,
    activeSessionID: ActiveSessionID,
    activeHistoryItem: ActiveHistoryItem,
    checkedPosts: CheckedPosts,
    bookmarker: Bookmark,
    grouper: Grouped,
    windows: Windows,
  },
})

