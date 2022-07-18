// Testing Groups
const axios = require('axios');

jest.mock("axios");

// test group to test the return value from the api
const testUser = {
   _id: "6272bdaee68c969ef9dfe827",
   username: "paul",
   password_hash: "$2a$10$AQPHBgvIjjLnFUQZTauN.uX8URnkx47wciIEzy7lV6IZ64lJ5MN7i",
   sessions: [
     {
       0: "62b4efdcc3c21a0550a58f5f"
     }
   ]
 }


// async API call for a group with a specific group ID
async function groups() {
   try {
      return await axios.get('http://localhost:3000/api/groups/6272bdaee68c969ef9dfe827');
   } catch (e) {
      return "Error - axios couldn't run mock API call";
   }
}


describe('Testing Suite for Group API', () => {
   describe("when API call succeeds", () => {
      it('Test for Group Data Structure', async () => {

         axios.get.mockResolvedValueOnce(testUser);

         // returns a promise
         const result = groups();

         // making sure that the function is calling the API correctly
         expect(axios.get).toHaveBeenCalledWith('http://localhost:3000/api/groups/6272bdaee68c969ef9dfe827');
         result.then(response => {
            expect(response).toStrictEqual(testUser);
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
         expect(axios.get).toHaveBeenCalledWith('http://localhost:3000/api/groups/6272bdaee68c969ef9dfe827');
         result.then(response => {
            expect(response).toEqual("Error - axios couldn't run mock API call");
         });
      });
   });
});
