// groups.test.js
import axios from 'axios';

const { MongoClient } = require('mongodb');
// const groups = () => {
//    axios.get(`https://localhost:3000/api/groups/62bcf9d935ecd3b837093c78`).then(response => {
//       console.log(response.label)
//    });
// }

// groups();

const swapiGetter = (id) =>
  axios.get(`https://swapi.dev/api/people/${id}/`).then((res) => res.data.name);

let testing = swapiGetter();
testing.then(function(result) {
   console.log(result);
})



describe('insert', () => {
  let connection;
  let db;

  beforeAll(async () => {
    connection = await MongoClient.connect(globalThis.__MONGO_URI__, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    db = await connection.db(globalThis.__MONGO_DB_NAME__);
  });

  afterAll(async () => {
    await connection.close();
  });

  test('should insert a group into collection', async () => {
    const groups = db.collection('groups');

    const mockGroup = {_id: 'some-user-id', color: '#8c564b', label: 'mockLabel', history: [{included_posts: [{label: 'mock'}]}]};
    await groups.insertOne(mockGroup);

    const insertedGroup = await groups.findOne({_id: 'some-user-id'});
    expect(insertedGroup).toEqual(mockGroup);
  });
});




/*
---- Test ----
Open connection to MongoDB groups 
Insert a group into the database
Call the API to fetch the group and see if it works
Delete the Group from the database
Close the connection to MongoDB groups
*/