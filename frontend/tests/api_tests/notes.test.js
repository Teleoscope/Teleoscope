// Testing Groups
const axios = require('axios');

jest.mock("axios");

// test group to test the return value from the api
const testNote = [{
   _id: "62bd2787ef125ffc4ec9fccd",
   post_id: "cr5swx",
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
      return await axios.get('http://localhost:3000/api/notes/62bd2787ef125ffc4ec9fccd');
   } catch (e) {
      return "Error - axios couldn't run mock API call";
   }
}


describe('Testing Suite for Notes API', () => {
   describe("when API call succeeds", () => {
      it('Test for Note Data Structure', async () => {

         axios.get.mockResolvedValueOnce(testNote);

         // returns a promise
         const result = groups();

         result.then( response => {
            console.log(response)
         });

         // making sure that the function is calling the API correctly
         expect(axios.get).toHaveBeenCalledWith('http://localhost:3000/api/notes/62bd2787ef125ffc4ec9fccd');
         result.then(response => {
            expect(response).toStrictEqual(testNote);
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



