// filteredPosts.js

import { createSlice } from '@reduxjs/toolkit'
export const FilteredPosts = createSlice({
   name: 'filteredPosts',
   initialState: {
      value: [],
      // [id: "", 1.0]
      selected: false
   },
   reducers: {
      filter: (state, action) => {
         var filteredGroups = action.payload
         state.value = filteredGroups

      },

      pressed: (state, action) => {
         state.selected = action.payload;
      }

   },
})

export const { filter, pressed } = FilteredPosts.actions

export default FilteredPosts.reducer