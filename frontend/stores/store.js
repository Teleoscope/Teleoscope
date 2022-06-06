import { configureStore } from '@reduxjs/toolkit'

import AddToWorkspace from "../actions/addtoworkspace"
import SearchTerm from "../actions/searchterm"
import ActiveTeleoscopeID from "../actions/activeTeleoscopeID"
import ActiveSessionID from "../actions/activeSessionID"
import ActiveHistoryItem from "../actions/activeHistoryItem"
import CheckedPosts from "../actions/checkedPosts"
import Bookmark from "../actions/bookmark"
import Tagged from '../actions/tagged'
import NamedTags from '../actions/namedTags'

export default configureStore({
  reducer: {
    adder: AddToWorkspace,
    searchTerm: SearchTerm,
    activeTeleoscopeID: ActiveTeleoscopeID,
    activeSessionID: ActiveSessionID,
    activeHistoryItem: ActiveHistoryItem,
    checkedPosts: CheckedPosts,
    bookmarker: Bookmark,
    tagger: Tagged,
    namedtagger: NamedTags
  },
})

