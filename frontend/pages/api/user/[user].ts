
/**
 * /api/user/[user]
 * user: ObjectId string
 * requires: authenticated user and user exists
 * returns: user object without hashed password
 */

import withSecureSession from "@/util/withSecureSession";
import { ObjectId } from "bson";
import { MongoClient } from 'mongodb';

async function handler(req, res, session) {
  
  
  const client = await new MongoClient(process.env.MONGODB_REGISTRAR_URI).connect();
  
  const db = await client.db("users");

  const user = await db.collection("users").findOne({_id: new ObjectId(req.query.user)}, { projection: { password: 0} })


  client.close()

  if (!user) {
    res.status(401).json({ message: "User not found."});
    return
  }

  return res.json(user)
}

export default withSecureSession(handler)