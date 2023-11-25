/**
 * /api/workspaces/[workspace]
 * workspace: ObjectID string
 * requires: authenticated user with avaiable session token cookie
 * returns: workspace object from MongoDB
 */

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

  const workspace = await db
    .collection("workspaces")
    .findOne(new ObjectId(req.query.workspace));

  client.close()

  return res.json(workspace)
}