// groups.test.js
// create test user
// make js file that is expected structure
// ----> hasOwnProperty
import axios from 'axios';

const { MongoClient } = require('mongodb');
async function groups(groupID){
   axios.get(`http://localhost:3000/api/groups/${groupID}`).then(response => console.log(response));
}

//console.log(await groups('62bcf9d935ecd3b837093c78'));
groups('62bcf9d935ecd3b837093c78');



// describe('insert', () => {
//   let connection;
//   let db;

//   beforeAll(async () => {
//     connection = await MongoClient.connect(globalThis.__MONGO_URI__, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });
//     db = await connection.db(globalThis.__MONGO_DB_NAME__);
//   });

//   afterAll(async () => {
//     await connection.close();
//   });

//   test('should insert a group into collection', async () => {
//     const groups = db.collection('groups');

//     const mockGroup = {_id: 'some-user-id', color: '#8c564b', label: 'mockLabel', history: [{included_posts: [{label: 'mock'}]}]};
//     await groups.insertOne(mockGroup);

//     const insertedGroup = await groups.findOne({_id: 'some-user-id'});
//     expect(insertedGroup).toEqual(mockGroup);
//   });
// });




/*
---- Test ----
Open connection to MongoDB groups 
Insert a group into the database
Call the API to fetch the group and see if it works
Delete the Group from the database
Close the connection to MongoDB groups
*/