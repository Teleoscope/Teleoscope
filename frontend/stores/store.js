import { configureStore } from '@reduxjs/toolkit'

import AddToWorkspace from "../actions/addtoworkspace"
import SearchTerm from "../actions/searchterm"
import ActiveTeleoscopeID from "../actions/activeTeleoscopeID"
import CheckedPosts from "../actions/checkedPosts"
import Bookmark from "../actions/bookmark"
import Tagged from '../actions/tagged'

export default configureStore({
  reducer: {
    adder: AddToWorkspace,
    searchTerm: SearchTerm,
    activeTeleoscopeID: ActiveTeleoscopeID,
    checkedPosts: CheckedPosts,
    bookmarker: Bookmark,
    tagger: Tagged,
  },
})

