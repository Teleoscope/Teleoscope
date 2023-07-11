import { authOptions } from 'pages/api/auth/[...nextauth]';
import { getServerSession } from "next-auth/next";
import { MongoClient } from "mongodb";
import { ObjectId } from "bson";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    res.status(401).json({ message: "You must be logged in to access.", session: session });
    return;
  }

  const client = await new MongoClient(process.env.MONGODB_REGISTRAR_URI).connect();
  const db = await client.db("users");

  const workspaces = await db
    .collection("workspaces")
    .find({ owner: new ObjectId(session.user.id)}).toArray();



  return res.json(workspaces)
}