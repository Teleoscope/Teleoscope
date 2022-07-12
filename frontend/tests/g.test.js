// Testing Groups


// Stomp.js imports
import { Experimental_CssVarsProvider } from "@mui/material";
import { group } from "../actions/groups.js";
import { client_init, publish, initialize_session } from "../components/Stomp.js";
//import axios from 'axios';
const axios = require('axios');


jest.mock("axios");

class DummyClient {
   publish(msg) {
      return msg;
   }
}

const testGroup = [{
   _id: "62bded3a66fbe8bc32c68a9a",
   color: "#17becf",
   label: "corporations",
   history: [{
      included_posts: [],
      label: "corporations"
   },
   {
      included_posts: ["esnzs0"],
      label: "corporations",
      action: "Add post to group"
   }]
}];


// async API call for a group with a specific group ID
async function groups() {
   try {
      return await axios.get('http://localhost:3000/api/groups/62bded3a66fbe8bc32c68a9a');
   } catch (e) {
      return "Error - axios couldn't run mock API call";
   }
}


describe('Testing Suite for Group API', () => {
   describe("when API call succeeds", () => {
      it('Test for Group Data Structure', async () => {

         axios.get.mockResolvedValueOnce(testGroup);

         const result = groups();
         result.then(response => {
            console.log('Groups data received: ', response);
         })

         expect(axios.get).toHaveBeenCalledWith('http://localhost:3000/api/groups/62bded3a66fbe8bc32c68a9a');
         result.then(response => {
            expect(response).toEqual(testGroup);
         });
      });
   });

   describe("when API call fails", () => {
      it('When API call is unsuccessful', () => {
         const message = "Network Error";
         axios.get.mockRejectedValueOnce(new Error(message));

         // when
         const result = groups();

         // then
         expect(axios.get).toHaveBeenCalledWith('http://localhost:3000/api/groups/62bded3a66fbe8bc32c68a9a');
         result.then(response => {
            expect(response).toEqual("Error - axios couldn't run mock API call");
         });
      });
   });
});


/* 
1. Create a user with set groups
2. Create a mock API call to the user with a specific group ID
3. Test to see if the format of the return values is what we expect
*/