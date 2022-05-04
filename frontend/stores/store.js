import { configureStore } from '@reduxjs/toolkit'

import Fav from "../actions/fav" 
import Hide from "../actions/hide" 
import AddToWorkspace from "../actions/addtoworkspace"
import SearchTerm from "../actions/searchterm"
import ActiveTeleoscopeID from "../actions/activeTeleoscopeID"
import CheckedPosts from "../actions/checkedPosts"

export default configureStore({
  reducer: {
  	faver: Fav,
    hider: Hide,
    adder: AddToWorkspace,
    searchTerm: SearchTerm,
    activeTeleoscopeID: ActiveTeleoscopeID,
    checkedPosts: CheckedPosts
  },
})