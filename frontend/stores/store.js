import { configureStore } from '@reduxjs/toolkit'
import Fav from "../actions/fav" 
export default configureStore({
  reducer: {
  	faver: Fav,
  },
})