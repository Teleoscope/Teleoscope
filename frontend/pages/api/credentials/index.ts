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
  
  if (user) {
    const compare = bcrypt.compareSync(credentials.password, user.password);
    if (compare) {
      client.close()
      return res.json({
        "username": user.username,
        "id": user._id,
      })
    } else {
      client.close()
      return res.status(401)
    }

  }
  
  else {
     try {
      const newUser = await db.collection("users").insertOne({ 
        username: credentials.username,
        password: hash
      })
      client.close()
      return res.json({
        "username": credentials.username,
        "id": newUser.insertedId.toString(),
      })
    } catch (error) {
      
      client.close()
      return res.status(401)
    }
  }
};
