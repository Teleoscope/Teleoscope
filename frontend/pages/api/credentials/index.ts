/**
 * /api/credentials/
 * credentials.username: string
 * credentials.password: cleartext password
 * effects: if user doesn't exist, register user
 * returns: returns username and OID
 */
import bcrypt from 'bcryptjs';
import { MongoClient } from "mongodb";

export default async (req, res) => {
  console.log("at least we got here")
  const client = await new MongoClient(process.env.MONGODB_REGISTRAR_URI).connect();
  const db = await client.db("users");

  const credentials = req.body;

  const user = await db.collection("users").findOne({ username: credentials.username });
  console.log("user", user)
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
      console.log("Credentials", compare)
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
      console.log("Credentials", error)
      return res.status(401)
    }
  }
};
