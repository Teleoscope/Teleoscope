// Testing Groups
const axios = require('axios');

jest.mock("axios");

// test group to test the return value from the api
const testNote = [{
   _id: "62d097bf1646bd1af324556b",
   postid: "cwc0mc",
   history: [{
      content: {
         block: [
            {
               key: "avi51",
               text: "All versions of this: ",
               type: "unstyled",
               depth: 0,
               inlineStyleRanges: [],
               entityRanges: [],
               data: {}
            }
         ],
         entityMap: {}
      },
      timestamp: "2022-06-30T04:33:45.880+00:00"
   }]
}];


// async API call for a group with a specific group ID
async function notes() {
   try {
      return await axios.get('http://localhost:3000/api/notes/62d097bf1646bd1af324556b');
   } catch (e) {
      return "Error - axios couldn't run mock API call";
   }
}

notes().then(response => {
   console.log(response);
})


describe('Testing Suite for Notes API', () => {
   describe("when API call succeeds", () => {
      it('Test for Note Data Structure', async () => {

         axios.get.mockResolvedValueOnce(testNote);

         // returns a promise
         const result = notes();

         // making sure that the function is calling the API correctly
         expect(axios.get).toHaveBeenCalledWith('http://localhost:3000/api/notes/62d097bf1646bd1af324556b');
         result.then(response => {
            console.log(response)
            expect(response).toStrictEqual(testNote);
         });
      });
   });

   describe("when API call fails", () => {
      it('When API call is unsuccessful', () => {
         const message = "Network Error";
         axios.get.mockRejectedValueOnce(new Error(message));

         // when
         const result = notes();

         // then
         expect(axios.get).toHaveBeenCalledWith('http://localhost:3000/api/notes/62d097bf1646bd1af324556b');
         result.then(response => {
            expect(response).toEqual("Error - axios couldn't run mock API call");
         });
      });
   });
});



