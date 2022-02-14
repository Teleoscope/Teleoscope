import { configureStore } from '@reduxjs/toolkit'
import Fav from "../actions/fav" 
import Hide from "../actions/hide" 
export default configureStore({
  reducer: {
  	faver: Fav,
    hider: Hide,
  },
})