import bcrypt from 'bcrypt';
import { MongoClient } from "mongodb";

export default async (req, res) => {
  const client = await new MongoClient(process.env.MONGODB_REGISTRAR_URI).connect();
  const db = await client.db("users");

  const credentials = req.body;  

  const user = await db.collection("users").findOne({ username: credentials.username });
  
  const saltRounds = 10;  
  const salt = bcrypt.genSaltSync(saltRounds);
  const hash = bcrypt.hashSync(credentials.password, salt);

  console.log("authenticating...", credentials, credentials.password, salt, hash)

  let ret = { "nothing": "nothing"}
  
  if (user) {
    const compare = bcrypt.compareSync(credentials.password, user.hash);
    if (compare) {
      ret = {
        "username": user.username,
        "id": user._id,
      }
    }
  } else {
     try {
      
      const newUser = await db.collection("users").insertOne({ 
        username: credentials.username,
        password: hash

      })
      ret = {
        "username": credentials.username,
        "id": newUser.insertedId.toString(),
      }
    } catch (error) {
      console.log('Failed to send.', error);
      res.json(ret);
    }
  }

  res.json(ret);
};
