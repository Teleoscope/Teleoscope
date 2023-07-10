import { MongoClient } from "mongodb";

export default async (req, res) => {
  const { username } = req.query;
  
  const client = await new MongoClient(process.env.MONGODB_REGISTRAR_URI).connect();
  
  const db = await client.db("users");
  
  const user = await db
    .collection("users")
    .findOne({ username: username });

  client.close()

  if (user) {
    res.json({found: true});
  } else {
    res.json({found: false});
  }

};