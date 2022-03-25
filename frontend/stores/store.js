import { configureStore } from '@reduxjs/toolkit'

import Fav from "../actions/fav" 
import Hide from "../actions/hide" 
import AddToWorkspace from "../actions/addtoworkspace"

export default configureStore({
  reducer: {
  	faver: Fav,
    hider: Hide,
    adder: AddToWorkspace
  },
})