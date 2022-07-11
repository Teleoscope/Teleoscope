// Testing Groups


// Stomp.js imports
import { client_init, publish, initialize_session } from "../components/Stomp.js";
//import axios from 'axios';
const axios = require('axios');

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
async function groups(){
   let res = await axios.get(`http://localhost:3000/api/groups/62bded3a66fbe8bc32c68a9a`).then(response => response);
   console.log(res)
   return res;
}


describe('Testing Suite for Group data from MongoDB', () => {
   test('Test for Group Data Structure' , () => {
      // publishes the DummyClient and returns the object body
      initialize_session(new DummyClient(), "paul");
      expect(groups()).toStrictEqual(testGroup);
   })
})


/* 
1. Create a user with set groups
2. Create a mock API call to the user with a specific group ID
3. Test to see if the format of the return values is what we expect
*/