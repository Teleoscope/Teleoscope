import * as toolkitRaw from '@reduxjs/toolkit';
const { createSlice } = toolkitRaw.default ?? toolkitRaw;
//import { createSlice } from '@reduxjs/toolkit';

export const Logins = createSlice({
   name: 'logins',
   initialState: {
      /*
      name maybe deleted for login state
      name: Theo
      email: admin@teleoscope.com
      password: teleoscope
    */
   },
   reducers: {
      login: (state, action) => {
         // Redux Toolkit allows us to write "mutating" logic in reducers. It
         // doesn't actually mutate the state because it uses the Immer library,
         // which detects changes to a "draft state" and produces a brand new
         // immutable state based off those changes

         // adds the login information to the state in order
         // for it to be tested in mongoDB
         console.log("Login Action.Payload", action.payload);
         state.value = action.payload;
      }
   }
})

// Action creators are generated for each case reducer function
export const {login} = Logins.actions

export default Logins.reducer