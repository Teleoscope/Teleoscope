/**
 * /api/user/[user]
 * user: ObjectId string
 * requires: authenticated user and user exists
 * returns: user object without hashed password
 */
import { authOptions } from 'pages/api/auth/[...nextauth]';
import { getServerSession } from "next-auth/next";
import clientPromise from "@/util/mongodb";
import { ObjectId } from "bson";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  const client = await clientPromise;
  const db = await client.db("users");

  const user = await db.collection("users").findOne({_id: new ObjectId(req.query.user)}, { projection: { password: 0} })


  if (!session) {
    res.status(401).json({ message: "You must be logged in."});
    return;
  }

  if (!user) {
    res.status(401).json({ message: "User not found."});
    return
  }

  return res.json(user)
}