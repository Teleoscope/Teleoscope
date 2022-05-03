import { configureStore } from '@reduxjs/toolkit'

import Fav from "../actions/fav" 
import Hide from "../actions/hide" 
import AddToWorkspace from "../actions/addtoworkspace"
import SearchTerm from "../actions/searchterm"
import ActiveTeleoscopeID from "../actions/activeTeleoscopeID"

export default configureStore({
  reducer: {
  	faver: Fav,
    hider: Hide,
    adder: AddToWorkspace,
    searcher: SearchTerm,
    activator: ActiveTeleoscopeID
  },
})